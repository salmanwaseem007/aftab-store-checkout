import type { ReceiptData } from '../stores/useReceiptStore';
import type { StoreDetails } from '../backend';
import { formatCurrency, formatDateSpanish } from './receiptUtils';

export type PrintStatus = 'idle' | 'printing' | 'success' | 'error';

/**
 * Get payment method label in Spanish
 */
function getPaymentMethodLabel(method: any): string {
  if (!method) return '';
  if (typeof method === 'string') {
    switch (method.toLowerCase()) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  }
  if (typeof method === 'object') {
    if ('cash' in method) return 'Efectivo';
    if ('card' in method) return 'Tarjeta';
    if ('transfer' in method) return 'Transferencia';
  }
  return '';
}

/**
 * Generate complete HTML document for thermal receipt printing
 */
function generateReceiptHTML(receipt: ReceiptData, storeDetails?: StoreDetails | null): string {
  const { date, time } = formatDateSpanish(receipt.createdDate);
  
  const isReturn = receipt.receiptType === 'return';
  const receiptId = isReturn ? receipt.returnNumber : receipt.orderNumber;
  
  // Use store details if available, otherwise fallback to defaults
  const storeName = storeDetails?.storeName || 'AFTAB STORE';
  const address = storeDetails?.address || 'C. ALBERTILLAS, 5, LOCAL, 29003 MÁLAGA';
  const phone = storeDetails?.phone || '952233833';
  const whatsapp = storeDetails?.whatsapp || '695250655';
  const taxId = storeDetails?.taxId;
  const email = storeDetails?.email;
  const website = storeDetails?.website;
  
  const paymentMethodLabel = getPaymentMethodLabel(receipt.paymentMethod);
  
  // Determine invoice type header
  const invoiceType = receipt.invoiceType || 'simplified';
  let invoiceHeaderHTML = '';
  let customerInfoHTML = '';
  
  if (isReturn) {
    // Return receipts keep left alignment
    invoiceHeaderHTML = `
      <div class="info-row">
        <span>RECIBO DE DEVOLUCIÓN</span>
      </div>
    `;
  } else {
    // Invoice headers are center-aligned
    if (invoiceType === 'simplified') {
      invoiceHeaderHTML = `
        <div class="invoice-header-centered">
          <span>FACTURA SIMPLIFICADA</span>
        </div>
      `;
    } else if (invoiceType === 'full') {
      invoiceHeaderHTML = `
        <div class="invoice-header-centered">
          <span>FACTURA</span>
        </div>
      `;
    }
    
    // Add customer details for full invoice
    if (invoiceType === 'full') {
      const custName = receipt.customerName ? receipt.customerName.toUpperCase() : '';
      const custTaxId = receipt.customerTaxId ? receipt.customerTaxId.toUpperCase() : '';
      
      customerInfoHTML = `
        <div style="margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-weight: bold;">
            <span>NOMBRE:</span>
            <span>${custName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-weight: bold;">
            <span>NIF/NIE/CIF:</span>
            <span>${custTaxId}</span>
          </div>
        </div>
      `;
    }
  }
  
  let itemsHTML = '';
  receipt.items.forEach((item) => {
    const qty = item.quantity.toString().padEnd(4);
    const desc = item.description.toUpperCase();
    const unitPrice = formatCurrency(item.unitPrice).padStart(8);
    const total = formatCurrency(item.total).padStart(8);
    
    itemsHTML += `
      <tr>
        <td style="padding: 2px 4px; text-align: left; font-weight: bold; white-space: nowrap;">${qty}</td>
        <td style="padding: 2px 4px; text-align: left; font-weight: bold; word-wrap: break-word; word-break: break-word;">${desc}</td>
        <td style="padding: 2px 4px; text-align: right; font-weight: bold; white-space: nowrap;">${unitPrice}</td>
        <td style="padding: 2px 4px; text-align: right; font-weight: bold; white-space: nowrap;">${total}</td>
      </tr>
    `;
  });
  
  const discountHTML = receipt.discount > 0 ? `
    <div class="total-row main">
      <span>DESCUENTO: -${formatCurrency(receipt.discount)}</span>
    </div>
  ` : '';

  // Generate IVA breakdown table HTML - positioned AFTER total
  let ivaHTML = '';
  if (receipt.ivaBreakdown && receipt.ivaBreakdown.length > 0) {
    // Calculate totals for TOTAL row
    let totalBaseImponible = 0;
    let totalCuota = 0;
    
    receipt.ivaBreakdown.forEach((iva) => {
      totalBaseImponible += iva.baseImponible;
      totalCuota += iva.cuota;
    });
    
    ivaHTML = `
      <div class="iva-section">
        <table>
          <thead>
            <tr>
              <th style="width: 15%; text-align: left; font-weight: bold;">IVA</th>
              <th style="width: 50%; text-align: right; font-weight: bold;">BASE IMPONIBLE (€)</th>
              <th style="width: 35%; text-align: right; font-weight: bold;">CUOTA (€)</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    receipt.ivaBreakdown.forEach((iva) => {
      ivaHTML += `
            <tr>
              <td style="padding: 2px 4px; text-align: left; font-weight: bold;">${iva.rate}%</td>
              <td style="padding: 2px 4px; text-align: right; font-weight: bold;">${formatCurrency(iva.baseImponible)}</td>
              <td style="padding: 2px 4px; text-align: right; font-weight: bold;">${formatCurrency(iva.cuota)}</td>
            </tr>
      `;
    });
    
    // Add TOTAL row
    ivaHTML += `
            <tr>
              <td style="padding: 2px 4px; text-align: left; font-weight: bold;">TOTAL</td>
              <td style="padding: 2px 4px; text-align: right; font-weight: bold;">${formatCurrency(totalBaseImponible)}</td>
              <td style="padding: 2px 4px; text-align: right; font-weight: bold;">${formatCurrency(totalCuota)}</td>
            </tr>
    `;
    
    ivaHTML += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Spanish closing lines after IVA breakdown table
  const closingLinesHTML = `
    <div class="closing-lines">
      <p style="text-align: center; font-weight: bold; margin: 8px 0 4px 0;">GRACIAS POR SU COMPRA</p>
      <p style="text-align: center; font-weight: bold; margin: 4px 0 8px 0;">GUARDAR EL RECIBO</p>
    </div>
  `;

  const returnReasonHTML = isReturn && receipt.returnReason ? `
    <div style="margin: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-weight: bold;">
        <span>MOTIVO:</span>
        <span>${receipt.returnReason.toUpperCase()}</span>
      </div>
      ${receipt.originalOrderNumber ? `<div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-weight: bold;"><span>PEDIDO ORIGINAL:</span><span>${receipt.originalOrderNumber}</span></div>` : ''}
    </div>
  ` : '';

  const optionalInfoHTML = `
    ${taxId ? `<p style="font-weight: bold;">CIF ${taxId.toUpperCase()}</p>` : ''}
    ${email ? `<p style="font-weight: bold;">${email.toUpperCase()}</p>` : ''}
    ${website ? `<p style="font-weight: bold;">${website.toUpperCase()}</p>` : ''}
  `;

  const paymentMethodHTML = paymentMethodLabel ? `
    <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-weight: bold;">
      <span>MÉTODO DE PAGO:</span>
      <span>${paymentMethodLabel.toUpperCase()}</span>
    </div>
  ` : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
          font-size: 10pt;
          line-height: 1.3;
          width: 80mm;
          margin: 0;
          padding: 8px;
          color: #000;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .header h1 {
          margin: 0 0 4px 0;
          font-size: 12pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        .header p {
          margin: 2px 0;
          font-size: 10pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        .info {
          margin: 8px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 2px 0;
          font-size: 10pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        .invoice-header-centered {
          text-align: center;
          margin: 2px 0;
          font-size: 10pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-family: 'Courier New', Courier, monospace;
          table-layout: fixed;
        }
        th {
          text-align: left;
          padding: 4px 2px;
          font-size: 9pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        td {
          font-size: 10pt;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
          vertical-align: top;
        }
        .total-section {
          margin: 12px 0;
          font-family: 'Courier New', Courier, monospace;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 4px 0;
          font-weight: bold;
          font-family: 'Courier New', Courier, monospace;
        }
        .total-row.main {
          font-size: 12pt;
          font-family: 'Courier New', Courier, monospace;
          text-align: right;
          justify-content: flex-end;
        }
        .total-row.main span {
          text-align: right;
        }
        .iva-section {
          margin-top: 16px;
          font-family: 'Courier New', Courier, monospace;
        }
        .closing-lines {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10pt;
        }
        .closing-lines p {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10pt;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${storeName.toUpperCase()}</h1>
        <p>${address.toUpperCase()}</p>
        <p>TEL ${phone}</p>
        <p>WHATSAPP ${whatsapp}</p>
        ${optionalInfoHTML}
      </div>
      
      <div class="info">
        ${invoiceHeaderHTML}
        <div class="info-row">
          <span>FECHA Y HORA:</span>
          <span>${date} ${time}</span>
        </div>
        <div class="info-row">
          <span>ID PEDIDO:</span>
          <span>${receiptId}</span>
        </div>
        ${paymentMethodHTML}
      </div>
      
      ${customerInfoHTML}
      ${returnReasonHTML}
      
      <table>
        <colgroup>
          <col style="width: 10%;">
          <col style="width: 50%;">
          <col style="width: 20%;">
          <col style="width: 20%;">
        </colgroup>
        <thead>
          <tr>
            <th style="text-align: left;">QTY</th>
            <th style="text-align: left;">DESCRIPCION</th>
            <th style="text-align: right;">P.UNIT</th>
            <th style="text-align: right;">IMP.(€)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="total-section">
        ${discountHTML}
        <div class="total-row main">
          <span>${isReturn ? 'REEMBOLSO (€):' : 'TOTAL (€):'} ${formatCurrency(receipt.total)}</span>
        </div>
      </div>
      
      ${ivaHTML}
      
      ${closingLinesHTML}
    </body>
    </html>
  `;
}

/**
 * Print receipt using the global hidden iframe with retry logic
 * @param receipt Receipt data to print
 * @param storeDetails Store details for receipt header
 * @param onStatusChange Callback for status updates
 * @returns Promise that resolves when printing is complete
 */
export async function printReceipt(
  receipt: ReceiptData,
  storeDetails: StoreDetails | null | undefined,
  onStatusChange: (status: PrintStatus) => void
): Promise<void> {
  const maxAttempts = 3;
  const retryDelay = 300;

  onStatusChange('printing');

  const attemptPrint = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        // Retrieve the global iframe from the DOM
        const iframe = document.getElementById('print-iframe') as HTMLIFrameElement | null;
        
        if (!iframe) {
          console.error('Print iframe not found in DOM. Ensure the iframe with id="print-iframe" exists in App.tsx');
          // Fallback to window.print()
          try {
            const html = generateReceiptHTML(receipt, storeDetails);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.print();
              printWindow.close();
              resolve(true);
              return;
            }
          } catch (fallbackError) {
            console.error('Fallback print error:', fallbackError);
          }
          resolve(false);
          return;
        }

        // Check if iframe contentWindow is accessible
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) {
          console.error('Iframe contentWindow not accessible');
          resolve(false);
          return;
        }

        // Generate HTML content
        const html = generateReceiptHTML(receipt, storeDetails);

        // Write content to iframe
        const doc = contentWindow.document;
        if (!doc) {
          console.error('Iframe document not accessible');
          resolve(false);
          return;
        }

        doc.open();
        doc.write(html);
        doc.close();

        // Wait for content to load, then print
        setTimeout(() => {
          try {
            contentWindow.print();
            resolve(true);
          } catch (error) {
            console.error('Print error:', error);
            resolve(false);
          }
        }, 250);
      } catch (error) {
        console.error('Print setup error:', error);
        resolve(false);
      }
    });
  };

  // Retry logic
  let success = false;
  let attempts = 0;

  while (attempts < maxAttempts && !success) {
    attempts++;
    success = await attemptPrint();
    
    if (!success && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  if (success) {
    onStatusChange('success');
  } else {
    onStatusChange('error');
  }
}
