const { google } = require('googleapis');

// FIX: Ensure the private key's newlines are correctly formatted.
const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

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

async function findRowById(id) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  // Add a check for result.data.values to prevent errors on empty sheets
  const values = result.data.values || [];
  const rowIndex = values.findIndex(row => row[0] === id);
  return rowIndex !== -1 ? rowIndex + 1 : null;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { action, payload } = JSON.parse(event.body);

    if (action === 'delete') {
      const { id } = payload;
      const rowNumber = await findRowById(id);
      if (rowNumber) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            }],
          },
        });
        return { statusCode: 200, body: JSON.stringify({ message: 'Berhasil dihapus.' }) };
      }
      return { statusCode: 404, body: JSON.stringify({ error: 'ID tidak ditemukan.' }) };

    } else if (action === 'update') {
        const { id, newStatus, newOrder } = payload;
        const rowNumber = await findRowById(id);

        if(rowNumber){
            const updates = [];
            if(newStatus) updates.push({ range: `${SHEET_NAME}!E${rowNumber}`, values: [[newStatus]] });
            if(newOrder !== undefined) updates.push({ range: `${SHEET_NAME}!F${rowNumber}`, values: [[newOrder]] });
            
            if(updates.length > 0){
                 await sheets.spreadsheets.values.batchUpdate({
                     spreadsheetId: SPREADSHEET_ID,
                     resource: {
                         valueInputOption: 'USER_ENTERED',
                         data: updates
                     }
                 });
                 return { statusCode: 200, body: JSON.stringify({ message: 'Berhasil diupdate.' }) };
            }
        }
        return { statusCode: 404, body: JSON.stringify({ error: 'ID tidak ditemukan.' }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Aksi tidak valid.' }) };
  } catch (error) {
    console.error('Error updating Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal mengupdate data di Google Sheets.' }),
    };
  }
};
