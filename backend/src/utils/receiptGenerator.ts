import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface ReceiptData {
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

export const generateReceiptPDF = async (data: ReceiptData): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      // Ensure receipts directory exists
      const receiptsDir = path.join(process.cwd(), 'receipts');
      if (!existsSync(receiptsDir)) {
        mkdirSync(receiptsDir);
      }
      
      const fileName = `receipt-${data.orderId}.pdf`;
      const filePath = path.join(receiptsDir, fileName);
      const stream = createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Header
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('ABYRA STORE', 110, 57)
        .fontSize(10)
        .text('Handcrafted with Love', 110, 80)
        .text('www.abyrastore.com', 110, 95)
        .moveDown();
        
      // Line
      doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, 115).lineTo(550, 115).stroke();
      
      // Invoice Details
      doc
        .fontSize(16)
        .fillColor('#000000')
        .text('INVOICE', 50, 130)
        .fontSize(10)
        .text(`Order ID: ${data.orderId}`, 50, 155)
        .text(`Date: ${data.date}`, 50, 170)
        .text(`Status: ${data.paymentStatus.toUpperCase()}`, 50, 185);
        
      // Customer Details
      doc
        .fontSize(12)
        .text('Bill To:', 300, 130)
        .fontSize(10)
        .text(data.customerName, 300, 155)
        .text(data.email, 300, 170)
        .text(data.phone, 300, 185)
        .text(data.address, 300, 200, { width: 250 });
        
      doc.moveDown(4);
      
      // Table Header
      const tableTop = 280;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Item', 50, tableTop)
        .text('Qty', 300, tableTop, { align: 'center' })
        .text('Price', 400, tableTop, { align: 'right' })
        .text('Total', 500, tableTop, { align: 'right' })
        .font('Helvetica');
        
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      // Items
      let currentY = tableTop + 30;
      data.items.forEach((item) => {
        doc
          .fontSize(10)
          .text(item.name, 50, currentY)
          .text(item.quantity.toString(), 300, currentY, { align: 'center' })
          .text(`₹${item.price.toFixed(2)}`, 400, currentY, { align: 'right' })
          .text(`₹${(item.price * item.quantity).toFixed(2)}`, 500, currentY, { align: 'right' });
          
        currentY += 25;
      });
      
      // Totals
      doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, currentY).lineTo(550, currentY).stroke();
      
      currentY += 15;
      doc
        .fontSize(12)
        .fillColor('#000000')
        .text('Grand Total:', 400, currentY, { align: 'right' })
        .text(`₹${data.totalAmount.toFixed(2)}`, 500, currentY, { align: 'right' });
        
      doc
        .fontSize(10)
        .fillColor('#444444')
        .text(`Payment Method: ${data.paymentMethod}`, 50, currentY);
        
      // Footer
      doc
        .fontSize(10)
        .fillColor('#aaaaaa')
        .text('Thank you for shopping with ABYRA STORE! Your support for handmade crafts means the world to us.', 50, 700, { align: 'center', width: 500 });
        
      doc.end();
      
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
