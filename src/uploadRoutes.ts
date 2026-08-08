import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
// @ts-ignore
import ofx from 'node-ofx-parser';
const pdfParse = require('pdf-parse');
import { prisma } from './prismaClient';
import path from 'path';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload/statement', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = (req as any).userId;
  const filePath = req.file.path;
  const originalName = req.file.originalname.toLowerCase();
  const bank = req.body.bank; // Optional for PDFs

  try {
    let importedCount = 0;

    // Helper to get default account
    const getDefaultAccountId = async () => {
      const defaultAccount = await prisma.account.findFirst({ where: { userId } });
      return defaultAccount?.id || '';
    };
    const defaultAccountId = req.body.accountId || await getDefaultAccountId();

    // Helper to save transactions
    const saveTransaction = async (amount: number, date: Date, desc: string, type?: 'INCOME' | 'EXPENSE') => {
      if (amount === 0 || isNaN(amount)) return;
      
      const calculatedType = type || (amount < 0 ? 'EXPENSE' : 'INCOME');
      await prisma.transaction.create({
        data: {
          amount: Math.abs(amount),
          type: calculatedType,
          date: date,
          description: desc.substring(0, 255), // limit desc length
          userId: userId,
          accountId: defaultAccountId,
          status: 'COMPLETED'
        }
      });
      importedCount++;
    };

    // --- CSV PARSING ---
    if (originalName.endsWith('.csv')) {
      const results: any[] = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      for (const row of results) {
        const amountStr = row.amount || row.Valor || row.Value || '0';
        const amount = parseFloat(String(amountStr).replace(',', '.'));
        const desc = row.description || row.Descricao || row.Description || 'Sem descrição';
        const dateStr = row.date || row.Data || row.Date || new Date().toISOString();
        let type = row.type || row.Tipo;
        
        await saveTransaction(
          amount, 
          new Date(dateStr), 
          desc, 
          type?.toUpperCase().includes('EXPENSE') ? 'EXPENSE' : undefined
        );
      }
    } 
    // --- EXCEL (XLS/XLSX) PARSING ---
    else if (originalName.endsWith('.xls') || originalName.endsWith('.xlsx')) {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' }); // read all rows

      for (const row of data) {
        // Find best matching keys by lowercasing them
        const keys = Object.keys(row);
        const lowerKeys = keys.map(k => k.toLowerCase());

        const amountKey = keys[lowerKeys.findIndex(k => k.includes('valor') || k.includes('value') || k.includes('amount') || k.includes('lançamento') || k.includes('lancamento'))] || 'Valor';
        const descKey = keys[lowerKeys.findIndex(k => k.includes('desc') || k.includes('hist') || k.includes('memo'))] || 'Descricao';
        const dateKey = keys[lowerKeys.findIndex(k => k.includes('data') || k.includes('date'))] || 'Data';

        let amountStr = String(row[amountKey] || '0').replace('R$', '').trim();
        // Adjust for Brazilian currency format if there is a comma before dot
        if (amountStr.includes(',') && amountStr.includes('.')) {
          amountStr = amountStr.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
        } else if (amountStr.includes(',')) {
          amountStr = amountStr.replace(',', '.'); // 12,34 -> 12.34
        }
        
        const amount = parseFloat(amountStr);
        const desc = row[descKey] || 'Sem descrição';
        
        // Date parsing
        let dateObj = new Date();
        const dateRaw = row[dateKey];
        if (dateRaw) {
          if (typeof dateRaw === 'number') {
            dateObj = new Date((dateRaw - (25567 + 2)) * 86400 * 1000);
          } else {
            // handle DD/MM/YYYY
            const parts = String(dateRaw).split('/');
            if (parts.length === 3) {
               dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
               dateObj = new Date(dateRaw);
            }
          }
        }
        
        await saveTransaction(amount, dateObj, String(desc));
      }
    }
    // --- OFX PARSING ---
    else if (originalName.endsWith('.ofx')) {
      const ofxData = fs.readFileSync(filePath, 'utf8');
      const parsed = ofx.parse(ofxData);
      
      let transList = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
      if (!transList) {
        transList = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;
      }

      if (transList) {
        const transactions = Array.isArray(transList) ? transList : [transList];
        
        for (const t of transactions) {
          const amount = parseFloat(t.TRNAMT);
          const desc = t.MEMO || t.NAME || 'Sem descrição';
          const dtStr = t.DTPOSTED || '';
          let dateObj = new Date();
          if (dtStr.length >= 8) {
            const year = parseInt(dtStr.substring(0, 4));
            const month = parseInt(dtStr.substring(4, 6)) - 1;
            const day = parseInt(dtStr.substring(6, 8));
            dateObj = new Date(year, month, day);
          }
          await saveTransaction(amount, dateObj, desc);
        }
      }
    }
    // --- PDF PARSING (RegEx) ---
    else if (originalName.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      
      // Fix pdfParse is not a function
      const pdfParseFn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
      const data = await pdfParseFn(dataBuffer);
      const text = data.text;

      const genericRegex = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
      
      let match;
      while ((match = genericRegex.exec(text)) !== null) {
        const dateStr = match[1];
        const desc = match[2].trim();
        const amountStr = match[3].replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        
        const [day, month, year] = dateStr.split('/');
        const fullYear = year.length === 2 ? `20${year}` : year;
        const dateObj = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));

        await saveTransaction(amount, dateObj, desc);
      }
      
      if (importedCount === 0) {
        return res.json({ message: "PDF lido, mas nenhuma transação encontrada pelos padrões de busca.", rawText: text.substring(0, 500) });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV, XLS, XLSX, OFX or PDF.' });
    }

    fs.unlinkSync(filePath); // Cleanup
    res.json({ message: `Successfully imported ${importedCount} transactions.`, count: importedCount });
    
  } catch (error: any) {
    console.error(error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

export default router;
