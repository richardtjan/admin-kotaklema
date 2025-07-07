const { google } = require('googleapis');

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
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = response.data.values || [];
    const data = rows.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      timestamp: row[3],
      status: row[4],
      order: parseFloat(row[5]) || 0,
    }));

    data.sort((a, b) => a.order - b.order);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal mengambil data dari Google Sheets.' }),
    };
  }
};
