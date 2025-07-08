const { google } = require('googleapis');

async function findRowById(sheets, SPREADSHEET_ID, SHEET_NAME, id) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const values = result.data.values || [];
  const rowIndex = values.findIndex(row => row[0] === id);
  return rowIndex !== -1 ? rowIndex + 1 : null;
}

exports.handler = async (event, context) => {
  console.log('--- STARTING updateQueue HANDLER ---');
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
    
    const { action, payload } = JSON.parse(event.body);

    if (action === 'delete') {
      const { id } = payload;
      const rowNumber = await findRowById(sheets, SPREADSHEET_ID, SHEET_NAME, id);
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
        const rowNumber = await findRowById(sheets, SPREADSHEET_ID, SHEET_NAME, id);

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
    console.error('CRITICAL ERROR in updateQueue handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal mengupdate data di Google Sheets.' }),
    };
  }
};
