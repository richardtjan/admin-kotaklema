const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

// FIX: Decode the entire JSON from a Base64 string first
const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
const credentials = JSON.parse(credentialsJson);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Antrian';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
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
    console.error('Error adding to Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal menambahkan data ke Google Sheets.' }),
    };
  }
};
