const { google } = require('googleapis');

class GoogleSheetsManager {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    this.serviceAccountAuth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    this.sheets = google.sheets({ version: 'v4', auth: this.serviceAccountAuth });
  }

  async initialize() {
    if (!this.spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('⚠️ Google Sheets not configured');
      return false;
    }

    try {
      // Test connection
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      console.log('✅ Google Sheets connected:', response.data.properties.title);
      
      // Initialize sheets if they don't exist
      await this.initializeSheets();
      return true;
    } catch (error) {
      console.error('❌ Google Sheets connection failed:', error.message);
      return false;
    }
  }

  async initializeSheets() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const existingSheets = response.data.sheets?.map(sheet => sheet.properties.title) || [];
      
      // Create Orders sheet if it doesn't exist
      if (!existingSheets.includes('Buyurtmalar')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Buyurtmalar'
                }
              }
            }]
          }
        });
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Buyurtmalar!A1:W1',
          valueInputOption: 'RAW',
          resource: {
            values: [[
              'Buyurtma Raqami', 'Sana', 'Mijoz Ismi', 'Telefon', 'Email', 
              'Manzil', 'Shahar', 'Mahsulotlar', 'Miqdor', 'Mahsulot Narxi',
              'Yetkazib Berish', 'Chegirma', 'Jami Summa', 'Tolov Usuli', 
              'Tolov Holati', 'Buyurtma Holati', 'Mijoz Izohi', 'Admin Izohi',
              'Track Raqam', 'Kurier', 'Tasdiqlangan', 'Yuborilgan', 'Yetkazilgan'
            ]]
          }
        });
        
        console.log('✅ Orders sheet created');
      }
      
      // Create Contacts sheet if it doesn't exist
      if (!existingSheets.includes('Murojaatlar')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Murojaatlar'
                }
              }
            }]
          }
        });
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Murojaatlar!A1:M1',
          valueInputOption: 'RAW',
          resource: {
            values: [[
              'ID', 'Sana', 'Ism', 'Telefon', 'Email', 'Mavzu', 'Xabar',
              'Turi', 'Holat', 'Muhimlik', 'Admin Izohi', 'Javob Berilgan', 'Javob Beruvchi'
            ]]
          }
        });
        
        console.log('✅ Contacts sheet created');
      }

    } catch (error) {
      console.error('❌ Error initializing sheets:', error.message);
    }
  }

  async addOrder(order) {
    if (!this.spreadsheetId) {
      console.warn('⚠️ Google Sheets ID not configured');
      return false;
    }

    try {
      console.log('📊 Adding order to Google Sheets:', order.orderNumber);
      
      const productsList = order.products.map(p => `${p.name} (${p.size})`).join(', ');
      const quantityList = order.products.map(p => p.quantity).join(', ');
      
      const rowData = [
        order.orderNumber,
        new Date(order.timestamps?.orderDate || order.createdAt).toLocaleString('uz-UZ'),
        order.customer?.name || '',
        order.customer?.phone || '',
        order.customer?.email || '',
        order.delivery?.address || '',
        order.delivery?.city || '',
        productsList,
        quantityList,
        order.pricing?.subtotal || 0,
        order.pricing?.deliveryCost || 0,
        order.pricing?.discount || 0,
        order.pricing?.totalPrice || 0,
        order.payment?.method || 'cash',
        order.payment?.status || 'pending',
        order.status || 'pending',
        order.notes?.customerNotes || '',
        order.notes?.adminNotes || '',
        order.tracking?.trackingNumber || '',
        order.tracking?.courierName || '',
        order.timestamps?.confirmedAt ? new Date(order.timestamps.confirmedAt).toLocaleString('uz-UZ') : '',
        order.timestamps?.shippedAt ? new Date(order.timestamps.shippedAt).toLocaleString('uz-UZ') : '',
        order.timestamps?.deliveredAt ? new Date(order.timestamps.deliveredAt).toLocaleString('uz-UZ') : ''
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Buyurtmalar!A:W',
        valueInputOption: 'RAW',
        resource: {
          values: [rowData]
        }
      });

      console.log('✅ Order added to Google Sheets successfully');
      return true;
    } catch (error) {
      console.error('❌ Error adding order to sheets:', error.message);
      console.error('Full error:', error);
      return false;
    }
  }

  async addContact(contact) {
    if (!this.spreadsheetId) {
      console.warn('⚠️ Google Sheets ID not configured');
      return false;
    }

    try {
      console.log('📊 Adding contact to Google Sheets');
      
      const rowData = [
        contact._id.toString(),
        new Date(contact.createdAt).toLocaleString('uz-UZ'),
        contact.name,
        contact.phone,
        contact.email || '',
        contact.subject || '',
        contact.message,
        contact.type || 'inquiry',
        contact.status || 'new',
        contact.priority || 'medium',
        contact.adminNotes || '',
        contact.repliedAt ? new Date(contact.repliedAt).toLocaleString('uz-UZ') : '',
        contact.repliedBy || ''
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Murojaatlar!A:M',
        valueInputOption: 'RAW',
        resource: {
          values: [rowData]
        }
      });

      console.log('✅ Contact added to Google Sheets successfully');
      return true;
    } catch (error) {
      console.error('❌ Error adding contact to sheets:', error.message);
      return false;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      console.log('✅ Google Sheets test successful:', response.data.properties.title);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets test failed:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsManager();