import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
// @ts-ignore
import ofx from 'node-ofx-parser';
let pdfParse: any = null;
import { prisma } from './prismaClient';

const router = Router();
const upload = multer({ dest: 'uploads/' });

interface RawParsedTx {
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: Date;
  description: string;
  userId: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId: string;
  rawCategoryName?: string;
  status: string;
  isInvoicePayment?: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findValueByKeys(row: Record<string, any>, candidateKeywords: string[]): any {
  const keys = Object.keys(row);
  for (const candidate of candidateKeywords) {
    const normCand = normalizeText(candidate);
    for (const key of keys) {
      const normKey = normalizeText(key);
      if (normKey === normCand || normKey.includes(normCand)) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return row[key];
        }
      }
    }
  }
  return undefined;
}

function parseBrazilianAmount(val: any): { amount: number; isNegative: boolean } {
  if (typeof val === 'number') {
    return { amount: Math.abs(val), isNegative: val < 0 };
  }
  if (!val) return { amount: 0, isNegative: false };

  let str = String(val).replace(/\u00A0/g, ' ').trim();
  const hasMinus = str.includes('-');
  const hasParentheses = /^\(.*\)$/.test(str);

  let clean = str
    .replace(/R\$/gi, '')
    .replace(/[CDcd]/g, '')
    .replace(/[()]/g, '')
    .replace(/[^\d,.-]/g, '')
    .trim();

  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return { amount: 0, isNegative: false };
  return { amount: Math.abs(num), isNegative: hasMinus || hasParentheses };
}

function parseBrazilianDate(dateRaw: any): Date {
  if (!dateRaw) return new Date();
  if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) return dateRaw;
  if (typeof dateRaw === 'number') {
    return new Date((dateRaw - (25567 + 2)) * 86400 * 1000);
  }
  const str = String(dateRaw).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const fullYear = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    const d = new Date(parseInt(fullYear), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

function inferTransactionType(desc: string, rawType?: string, isNegative?: boolean): 'INCOME' | 'EXPENSE' {
  const combined = `${desc} ${rawType || ''}`.toLowerCase();
  
  // Estornos, reembolsos, cancelamentos, devoluções, créditos são RECEITAS
  if (
    isNegative ||
    combined.includes('estorno') ||
    combined.includes('reembolso') ||
    combined.includes('devolucao') ||
    combined.includes('devolução') ||
    combined.includes('credito a favor') ||
    combined.includes('crédito a favor') ||
    combined.includes('cancelamento de compra') ||
    combined.includes('pix recebido') ||
    combined.includes('deposito recebido') ||
    combined.includes('depósito recebido') ||
    combined.includes('rendimento')
  ) {
    return 'INCOME';
  }
  
  return 'EXPENSE';
}

function isInvoicePayment(desc: string): boolean {
  if (!desc) return false;
  const norm = normalizeText(desc);
  
  const paymentKeywords = [
    'pagamento on line',
    'pagamento online',
    'pagamento fatura',
    'pagamento de fatura',
    'pagamento da fatura',
    'pgto fatura',
    'pagto fatura',
    'pgto de fatura',
    'pagto de fatura',
    'pagamento recebido',
    'credito de pagamento',
    'crédito de pagamento',
    'pagamento efetuado',
    'liquidacao de fatura',
    'liquidacao fatura',
    'pagto debito',
    'pgto debito',
    'pagto eletron',
    'pagamento ficha compensacao',
    'pagamento cartao',
    'pagamento de cartao',
    'pgto cartao',
    'pagamento antecipado',
    'pagamento de boleto - fatura',
    'debito automatico fatura',
    'pgto titulo internet',
    'pagto titulo'
  ];

  for (const kw of paymentKeywords) {
    if (norm.includes(kw)) return true;
  }

  const hasPagto = norm.includes('pagamento') || norm.includes('pgto') || norm.includes('pagto');
  const hasTarget = norm.includes('fatura') || norm.includes('on line') || norm.includes('online');
  if (hasPagto && hasTarget) return true;

  return false;
}

// Helper to parse file and return raw transactions array
async function parseFile(filePath: string, originalName: string, userId: string, defaultAccountId: string): Promise<RawParsedTx[]> {
  const transactions: RawParsedTx[] = [];
  
  const addTransaction = (amount: number, date: Date, desc: string, rawCat?: string, explicitType?: 'INCOME' | 'EXPENSE') => {
    if (amount === 0 || isNaN(amount)) return;
    const cleanDesc = desc ? desc.substring(0, 255).trim() : 'Sem descrição';
    const isPayment = isInvoicePayment(cleanDesc);
    transactions.push({
      amount: Math.abs(amount),
      type: explicitType || 'EXPENSE',
      date: date,
      description: cleanDesc,
      userId,
      accountId: defaultAccountId,
      categoryId: '',
      rawCategoryName: rawCat ? String(rawCat).trim() : undefined,
      status: 'COMPLETED',
      isInvoicePayment: isPayment
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
      const rawDate = findValueByKeys(row, ['data', 'date', 'data transacao', 'data lancamento', 'dt', 'periodo']);
      const rawDesc = findValueByKeys(row, ['lancamento', 'lançamento', 'descricao', 'descrição', 'description', 'historico', 'histórico', 'estabelecimento', 'local', 'memo', 'titulo', 'título', 'transacao', 'transação', 'detalhe', 'detalhes', 'item']);
      const rawCategory = findValueByKeys(row, ['categoria', 'category', 'grupo', 'tag', 'classificacao', 'classificação', 'tipo de gasto']);
      const rawType = findValueByKeys(row, ['tipo', 'type', 'natureza']);
      const rawAmount = findValueByKeys(row, ['valor', 'value', 'amount', 'total', 'vl', 'preco', 'preço', 'saldo']);

      const { amount, isNegative } = parseBrazilianAmount(rawAmount);
      const dateObj = parseBrazilianDate(rawDate);
      const desc = rawDesc || 'Sem descrição';
      const type = inferTransactionType(desc, rawType, isNegative);

      addTransaction(amount, dateObj, desc, rawCategory, type);
    }
  } else if (originalName.endsWith('.xls') || originalName.endsWith('.xlsx')) {
    // Read file as buffer to avoid issues with Multer temp files without extension
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' }); 

    for (const row of data) {
      const rawDate = findValueByKeys(row, ['data', 'date', 'data transacao', 'data lancamento', 'dt', 'periodo']);
      const rawDesc = findValueByKeys(row, ['lancamento', 'lançamento', 'descricao', 'descrição', 'description', 'historico', 'histórico', 'estabelecimento', 'local', 'memo', 'titulo', 'título', 'transacao', 'transação', 'detalhe', 'detalhes', 'item']);
      const rawCategory = findValueByKeys(row, ['categoria', 'category', 'grupo', 'tag', 'classificacao', 'classificação', 'tipo de gasto']);
      const rawType = findValueByKeys(row, ['tipo', 'type', 'natureza']);
      const rawAmount = findValueByKeys(row, ['valor', 'value', 'amount', 'total', 'vl', 'preco', 'preço', 'saldo']);

      const { amount, isNegative } = parseBrazilianAmount(rawAmount);
      const dateObj = parseBrazilianDate(rawDate);
      const desc = rawDesc || 'Sem descrição';
      const type = inferTransactionType(desc, rawType, isNegative);

      addTransaction(amount, dateObj, desc, rawCategory, type);
    }
  } else if (originalName.endsWith('.ofx')) {
    const ofxData = fs.readFileSync(filePath, 'utf8');
    const parsed = ofx.parse(ofxData);
    
    let transList = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
    if (!transList) transList = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

    if (transList) {
      const txs = Array.isArray(transList) ? transList : [transList];
      for (const t of txs) {
        const amountNum = parseFloat(t.TRNAMT);
        const desc = t.MEMO || t.NAME || 'Sem descrição';
        const dtStr = t.DTPOSTED || '';
        let dateObj = new Date();
        if (dtStr.length >= 8) {
          const year = parseInt(dtStr.substring(0, 4));
          const month = parseInt(dtStr.substring(4, 6)) - 1;
          const day = parseInt(dtStr.substring(6, 8));
          dateObj = new Date(year, month, day);
        }
        const type = inferTransactionType(desc, t.TRNTYPE, amountNum < 0);
        addTransaction(Math.abs(amountNum), dateObj, desc, undefined, type);
      }
    }
  } else if (originalName.endsWith('.pdf')) {
    if (!pdfParse) {
      if (typeof (global as any).DOMMatrix === 'undefined') {
        (global as any).DOMMatrix = class DOMMatrix {};
      }
      if (typeof (global as any).ImageData === 'undefined') {
        (global as any).ImageData = class ImageData {};
      }
      if (typeof (global as any).Path2D === 'undefined') {
        (global as any).Path2D = class Path2D {};
      }
      pdfParse = require('pdf-parse');
    }
    const dataBuffer = fs.readFileSync(filePath);
    let text = '';
    try {
      if (typeof pdfParse === 'function') {
        const parsed = await pdfParse(dataBuffer);
        text = parsed.text || '';
      } else if (pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        await parser.load();
        const parsed = await parser.getText();
        text = parsed.text || '';
      } else if (pdfParse.default) {
        const parsed = typeof pdfParse.default === 'function' ? await pdfParse.default(dataBuffer) : await (new pdfParse.default({ data: dataBuffer })).getText();
        text = parsed.text || '';
      } else {
        throw new Error('Mecanismo de leitura de PDF indisponível');
      }
    } catch (pdfErr: any) {
      console.error('Erro na extração de texto do PDF:', pdfErr);
      throw new Error(`Erro ao ler arquivo PDF: ${pdfErr.message || 'Formato incompatível'}`);
    }

    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

    // Line-by-line parsing for Brazilian bank statements (Inter, Nubank, Itaú, etc.)
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      // Ignore common non-transaction statement headers
      if (
        lowerLine.startsWith('saldo anterior') ||
        lowerLine.startsWith('saldo final') ||
        lowerLine.startsWith('total de') ||
        lowerLine.includes('extrato de conta') ||
        lowerLine.includes('banco inter s.a.') ||
        (lowerLine.startsWith('data') && lowerLine.includes('histórico')) ||
        lowerLine.startsWith('página ')
      ) {
        continue;
      }

      // Check if line contains a date (DD/MM/YYYY or DD/MM/YY)
      const dateMatch = line.match(/\b(\d{2}\/\d{2}\/\d{2,4})\b/);
      if (!dateMatch) continue;

      const dateStr = dateMatch[1];
      const dateObj = parseBrazilianDate(dateStr);
      if (isNaN(dateObj.getTime())) continue;

      // Match Brazilian currency values with optional R$, +/-, and C/D flags (e.g. - R$ 150,00, R$ 1.250,00, 150,00 D)
      const valueMatches = Array.from(line.matchAll(/(?:[-+]\s*)?(?:R\$\s*)?(?:[-+]\s*)?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[CDcd]\b)?/gi)) as RegExpMatchArray[];
      if (valueMatches.length === 0) continue;

      const rawValStr = valueMatches[0][0];
      const isDebit = rawValStr.includes('D') || rawValStr.includes('d') || rawValStr.includes('-');
      const isCredit = rawValStr.includes('C') || rawValStr.includes('c') || rawValStr.includes('+');

      const { amount } = parseBrazilianAmount(rawValStr);
      if (amount === 0) continue;

      // Extract description by removing date and matched amount
      let desc = line
        .replace(dateStr, '')
        .replace(rawValStr, '');

      if (valueMatches.length > 1) {
        desc = desc.replace(valueMatches[1][0], '');
      }

      desc = desc
        .replace(/R\$/gi, '')
        .replace(/[-+:\s]+$/g, '')
        .replace(/^[-+:\s]+/g, '')
        .replace(/[|•]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!desc) desc = 'Lançamento extrato';

      const type = inferTransactionType(desc, isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined, isCredit);
      addTransaction(amount, dateObj, desc, undefined, type);
    }

    // Fallback: Global regex if line-by-line yielded 0 transactions
    if (transactions.length === 0) {
      const genericRegex = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([+-]?\s*(?:R\$\s*)?[+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[CD])?)/gi;
      let match;
      while ((match = genericRegex.exec(text)) !== null) {
        const dateStr = match[1];
        const rawDesc = match[2].trim();
        const rawValStr = match[3];

        const isDebit = rawValStr.includes('D') || rawValStr.includes('d') || rawValStr.includes('-');
        const isCredit = rawValStr.includes('C') || rawValStr.includes('c') || rawValStr.includes('+');
        const { amount } = parseBrazilianAmount(rawValStr);
        const dateObj = parseBrazilianDate(dateStr);

        const type = inferTransactionType(rawDesc, isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined, isCredit);
        addTransaction(amount, dateObj, rawDesc, undefined, type);
      }
    }
  } else {
    throw new Error('Formato de arquivo não suportado. Utilize PDF, CSV, OFX ou XLSX.');
  }

  return transactions;
}

// Helper to ensure a valid accountId exists for the user
async function resolveUserAccount(userId: string, accountId?: string): Promise<string> {
  if (accountId) {
    const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (acc) return acc.id;
  }
  let account = await prisma.account.findFirst({ where: { userId } });
  if (!account) {
    account = await prisma.account.create({
      data: {
        name: 'Conta Principal',
        type: 'CHECKING',
        userId,
        initialBalance: 0,
      }
    });
  }
  return account.id;
}

// Helper to match or create categories for parsed transactions
async function matchOrCreateCategories(userId: string, transactions: RawParsedTx[]): Promise<void> {
  const userCategories = await prisma.category.findMany({ where: { userId } });
  const catMap = new Map<string, { id: string; name: string; type: string }>();
  userCategories.forEach(c => {
    catMap.set(normalizeText(c.name), c);
  });

  const synonyms: Record<string, string[]> = {
    'alimentacao': ['supermercado', 'restaurante', 'restaurantes', 'bares', 'lanches', 'padaria', 'refeicao', 'alimentacao'],
    'saude': ['drogaria', 'farmacia', 'farmacias', 'medico', 'laboratorio', 'saude'],
    'transporte': ['uber', '99', 'combustivel', 'posto', 'gasolina', 'estacionamento', 'pedagio', 'transporte'],
    'educacao': ['ensino', 'escola', 'curso', 'faculdade', 'livraria', 'livrarias', 'educacao'],
    'vestuario': ['roupas', 'calcados', 'loja', 'vestuario'],
    'lazer': ['entretenimento', 'cinema', 'viagem', 'jogos', 'streaming', 'lazer'],
    'moradia': ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'moradia'],
    'outros (despesa)': ['outros', 'compras', 'servicos', 'diversos']
  };

  for (const t of transactions) {
    if (t.rawCategoryName && String(t.rawCategoryName).trim()) {
      const rawCatStr = String(t.rawCategoryName).trim();
      const normRaw = normalizeText(rawCatStr);

      // 1. Direct exact match
      if (catMap.has(normRaw)) {
        t.categoryId = catMap.get(normRaw)!.id;
        continue;
      }

      // 2. Partial match
      let matchedId = '';
      for (const [existingNorm, catObj] of catMap.entries()) {
        if (normRaw.includes(existingNorm) || existingNorm.includes(normRaw)) {
          matchedId = catObj.id;
          break;
        }
      }

      if (!matchedId) {
        // 3. Synonym match
        for (const [standardKey, synList] of Object.entries(synonyms)) {
          if (synList.some(s => normRaw.includes(s))) {
            const candidateCat = Array.from(catMap.values()).find(c => normalizeText(c.name).includes(standardKey) && c.type === t.type);
            if (candidateCat) {
              matchedId = candidateCat.id;
              break;
            }
          }
        }
      }

      if (matchedId) {
        t.categoryId = matchedId;
      } else {
        // 4. Auto-create new category for user with nice Title Case formatting (e.g. "SUPERMERCADO" -> "Supermercado")
        const formattedName = rawCatStr.charAt(0).toUpperCase() + rawCatStr.slice(1).toLowerCase();
        try {
          const newCat = await prisma.category.create({
            data: {
              name: formattedName,
              type: t.type,
              userId
            }
          });
          catMap.set(normRaw, newCat);
          t.categoryId = newCat.id;
        } catch (e) {
          // ignore duplicate race
        }
      }
    }
  }

  // For transactions still without categoryId, run description-based historical heuristic
  const unassigned = transactions.filter(t => !t.categoryId);
  if (unassigned.length > 0) {
    const pastTransactions = await prisma.transaction.findMany({
      where: { userId, categoryId: { not: null } },
      select: { description: true, categoryId: true }
    });

    const descMap: Record<string, Record<string, number>> = {};
    pastTransactions.forEach(pt => {
      const d = normalizeText(pt.description);
      if (!descMap[d]) descMap[d] = {};
      if (pt.categoryId) {
        descMap[d][pt.categoryId] = (descMap[d][pt.categoryId] || 0) + 1;
      }
    });

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

    unassigned.forEach(t => {
      const d = normalizeText(t.description);
      if (bestCategoryMap[d]) {
        t.categoryId = bestCategoryMap[d];
      } else {
        for (const knownDesc of Object.keys(bestCategoryMap)) {
          if (d.includes(knownDesc) || knownDesc.includes(d)) {
            t.categoryId = bestCategoryMap[knownDesc];
            break;
          }
        }
      }
    });
  }
}

// ----------------------------------------------------
// ORIGINAL UPLOAD (Direct Save)
// ----------------------------------------------------
router.post('/upload/statement', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = (req as any).userId;
  const filePath = req.file.path;
  try {
    const defaultAccountId = await resolveUserAccount(userId, req.body.accountId);
    const transactions = await parseFile(filePath, req.file.originalname.toLowerCase(), userId, defaultAccountId);
    await matchOrCreateCategories(userId, transactions);

    let importedCount = 0;
    for (const t of transactions) {
      await prisma.transaction.create({
        data: {
          amount: t.amount,
          type: t.type,
          date: t.date,
          description: t.description,
          userId: t.userId,
          accountId: t.accountId,
          categoryId: t.categoryId || undefined,
          status: t.status || 'COMPLETED'
        }
      });
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
// NEW UPLOAD PREVIEW (With Heuristic & Category Matching)
// ----------------------------------------------------
router.post('/upload/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = (req as any).userId;
  const filePath = req.file.path;
  try {
    const defaultAccountId = await resolveUserAccount(userId, req.body.accountId);
    const transactions = await parseFile(filePath, req.file.originalname.toLowerCase(), userId, defaultAccountId);
    await matchOrCreateCategories(userId, transactions);

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
