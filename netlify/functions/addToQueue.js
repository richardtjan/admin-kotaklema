const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  console.log('--- STARTING addToQueue HANDLER ---');
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!rawPrivateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('One or more Google credentials environment variables are not set.');
    }
    
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    const SHEET_NAME = 'Antrian';

    const { name, phone, order } = JSON.parse(event.body);

    if (!name || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nama dan nomor telepon harus diisi.' }) };
    }

    const newRow = [
      uuidv4(),
      name,
      phone,
      new Date().toISOString(),
      'waiting',
      order,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Berhasil ditambahkan ke antrian.' }),
    };
  } catch (error) {
    console.error('CRITICAL ERROR in addToQueue handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal menambahkan data ke Google Sheets.' }),
    };
  }
};
