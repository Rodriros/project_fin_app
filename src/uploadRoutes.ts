import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
// @ts-ignore
import ofx from 'node-ofx-parser';
const pdfParse = require('pdf-parse');
import { prisma } from './prismaClient';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Helper to parse file and return raw transactions array
async function parseFile(filePath: string, originalName: string, userId: string, defaultAccountId: string) {
  const transactions: any[] = [];
  
  const addTransaction = (amount: number, date: Date, desc: string, type?: 'INCOME' | 'EXPENSE') => {
    if (amount === 0 || isNaN(amount)) return;
    const calculatedType = type || (amount < 0 ? 'EXPENSE' : 'INCOME');
    transactions.push({
      amount: Math.abs(amount),
      type: calculatedType,
      date: date,
      description: desc.substring(0, 255),
      userId,
      accountId: defaultAccountId,
      categoryId: '',
      status: 'COMPLETED'
    });
  };

  if (originalName.endsWith('.csv')) {
    // Read file content to detect delimiter
    const fileContent = fs.readFileSync(filePath, 'utf8');
    // Remove BOM if present
    const cleanContent = fileContent.replace(/^\uFEFF/, '');
    
    // Detect delimiter: if semicolons are more common than commas in the first line, use semicolon
    const firstLine = cleanContent.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    const results: any[] = [];
    // Write cleaned content to a temp file for csv-parser
    const tempPath = filePath + '_clean.csv';
    fs.writeFileSync(tempPath, cleanContent, 'utf8');
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempPath)
        .pipe(csv({ separator: delimiter }))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Clean up temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    for (const row of results) {
      const amountStr = row.amount || row.Valor || row.Value || row.valor || row.value || '0';
      let parsedAmount = String(amountStr).replace('R$', '').trim();
      // Handle Brazilian number format: 1.234,56 -> 1234.56
      if (parsedAmount.includes(',') && parsedAmount.includes('.')) {
        parsedAmount = parsedAmount.replace(/\./g, '').replace(',', '.');
      } else if (parsedAmount.includes(',')) {
        parsedAmount = parsedAmount.replace(',', '.');
      }
      const amount = parseFloat(parsedAmount);
      const desc = row.description || row.Descricao || row.Description || row.descricao || row.Descrição || row.descrição || row.historico || row.Historico || row.Histórico || 'Sem descrição';
      const dateStr = row.date || row.Data || row.Date || row.data || new Date().toISOString();
      let type = row.type || row.Tipo || row.tipo;
      
      // Try to parse date in DD/MM/YYYY format
      let dateObj = new Date();
      const parts = String(dateStr).split('/');
      if (parts.length === 3) {
        const fullYear = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dateObj = new Date(parseInt(fullYear), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        dateObj = new Date(dateStr);
      }
      if (isNaN(dateObj.getTime())) dateObj = new Date();
      
      addTransaction(amount, dateObj, desc, type?.toUpperCase().includes('EXPENSE') ? 'EXPENSE' : undefined);
    }
  } else if (originalName.endsWith('.xls') || originalName.endsWith('.xlsx')) {
    // Read file as buffer to avoid issues with Multer temp files without extension
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' }); 

    for (const row of data) {
      const keys = Object.keys(row);
      const lowerKeys = keys.map(k => k.toLowerCase());

      const amountKey = keys[lowerKeys.findIndex(k => k.includes('valor') || k.includes('value') || k.includes('amount'))] || 'Valor';
      const descKey = keys[lowerKeys.findIndex(k => k.includes('desc') || k.includes('hist') || k.includes('memo') || k.includes('lançamento') || k.includes('lancamento'))] || 'Descricao';
      const dateKey = keys[lowerKeys.findIndex(k => k.includes('data') || k.includes('date'))] || 'Data';

      let amountStr = String(row[amountKey] || '0').replace('R$', '').trim();
      if (amountStr.includes(',') && amountStr.includes('.')) {
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
      } else if (amountStr.includes(',')) {
        amountStr = amountStr.replace(',', '.');
      }
      
      const amount = parseFloat(amountStr);
      const desc = row[descKey] || 'Sem descrição';
      
      let dateObj = new Date();
      const dateRaw = row[dateKey];
      if (dateRaw) {
        if (typeof dateRaw === 'number') {
          dateObj = new Date((dateRaw - (25567 + 2)) * 86400 * 1000);
        } else {
          const parts = String(dateRaw).split('/');
          if (parts.length === 3) {
             const fullYear = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
             dateObj = new Date(parseInt(fullYear), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
             dateObj = new Date(dateRaw);
          }
        }
      }
      
      addTransaction(amount, dateObj, String(desc));
    }
  } else if (originalName.endsWith('.ofx')) {
    const ofxData = fs.readFileSync(filePath, 'utf8');
    const parsed = ofx.parse(ofxData);
    
    let transList = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
    if (!transList) transList = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

    if (transList) {
      const txs = Array.isArray(transList) ? transList : [transList];
      for (const t of txs) {
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
        addTransaction(amount, dateObj, desc);
      }
    }
  } else if (originalName.endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
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

      addTransaction(amount, dateObj, desc);
    }
  } else {
    throw new Error('Unsupported file format');
  }

  return transactions;
}

// ----------------------------------------------------
// ORIGINAL UPLOAD (Direct Save)
// ----------------------------------------------------
router.post('/upload/statement', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = (req as any).userId;
  const filePath = req.file.path;
  try {
    let defaultAccountId = req.body.accountId;
    if (!defaultAccountId) {
      const defaultAccount = await prisma.account.findFirst({ where: { userId } });
      defaultAccountId = defaultAccount?.id || '';
    }

    const transactions = await parseFile(filePath, req.file.originalname.toLowerCase(), userId, defaultAccountId);
    
    // Direct save
    let importedCount = 0;
    for (const t of transactions) {
      await prisma.transaction.create({ data: { ...t, categoryId: undefined } });
      importedCount++;
    }

    fs.unlinkSync(filePath);
    res.json({ message: `Successfully imported ${importedCount} transactions.`, count: importedCount });
  } catch (error: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

// ----------------------------------------------------
// NEW UPLOAD PREVIEW (With Heuristic)
// ----------------------------------------------------
router.post('/upload/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = (req as any).userId;
  const filePath = req.file.path;
  try {
    let defaultAccountId = req.body.accountId;
    if (!defaultAccountId) {
      const defaultAccount = await prisma.account.findFirst({ where: { userId } });
      defaultAccountId = defaultAccount?.id || '';
    }

    const transactions = await parseFile(filePath, req.file.originalname.toLowerCase(), userId, defaultAccountId);
    
    // HEURISTIC CATEGORIZATION
    // Build a map of descriptions to most used category for this user
    const pastTransactions = await prisma.transaction.findMany({
      where: { userId, categoryId: { not: null } },
      select: { description: true, categoryId: true }
    });

    // Count occurrences: desc -> categoryId -> count
    const descMap: Record<string, Record<string, number>> = {};
    pastTransactions.forEach(pt => {
      const d = pt.description.toLowerCase().trim();
      if (!descMap[d]) descMap[d] = {};
      if (pt.categoryId) {
        descMap[d][pt.categoryId] = (descMap[d][pt.categoryId] || 0) + 1;
      }
    });

    // Find the most frequent category for each description
    const bestCategoryMap: Record<string, string> = {};
    Object.keys(descMap).forEach(d => {
      let maxCount = 0;
      let bestCat = '';
      Object.keys(descMap[d]).forEach(cat => {
        if (descMap[d][cat] > maxCount) {
          maxCount = descMap[d][cat];
          bestCat = cat;
        }
      });
      bestCategoryMap[d] = bestCat;
    });

    // Apply heuristic to parsed transactions
    transactions.forEach(t => {
      const d = t.description.toLowerCase().trim();
      // Partial matching: Check if any known description is a substring of the new description (or vice-versa)
      // For a simple approach, just do exact match first
      if (bestCategoryMap[d]) {
        t.categoryId = bestCategoryMap[d];
      } else {
        // Simple fallback: try partial match
        for (const knownDesc of Object.keys(bestCategoryMap)) {
          if (d.includes(knownDesc) || knownDesc.includes(d)) {
            t.categoryId = bestCategoryMap[knownDesc];
            break;
          }
        }
      }
    });

    fs.unlinkSync(filePath);
    res.json({ transactions });
  } catch (error: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to preview file', details: error.message });
  }
});

// ----------------------------------------------------
// HEURISTIC SUGGESTION ENDPOINT (For manual entry)
// ----------------------------------------------------
router.get('/transactions/suggest-category', async (req, res) => {
  const userId = (req as any).userId;
  const description = (req.query.description as string || '').toLowerCase().trim();

  if (!description) return res.json({ categoryId: null });

  const pastTransactions = await prisma.transaction.findMany({
    where: { 
      userId, 
      categoryId: { not: null },
      description: { contains: description }
    },
    select: { categoryId: true }
  });

  if (pastTransactions.length === 0) return res.json({ categoryId: null });

  // Count frequencies
  const counts: Record<string, number> = {};
  pastTransactions.forEach(pt => {
    if (pt.categoryId) counts[pt.categoryId] = (counts[pt.categoryId] || 0) + 1;
  });

  let bestCat = null;
  let maxCount = 0;
  for (const cat in counts) {
    if (counts[cat] > maxCount) {
      maxCount = counts[cat];
      bestCat = cat;
    }
  }

  res.json({ categoryId: bestCat });
});

export default router;
