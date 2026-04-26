const fmt = (n, dec = 2) => new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: dec, maximumFractionDigits: dec
}).format(n || 0)

export default function ChallanPrint({ bill, profile }) {
  if (!bill || !profile) return null

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      color: '#000',
      padding: '20px',
      maxWidth: '400px',
      background: '#fff',
      border: '1px solid #ccc',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #00008B', paddingBottom: 8, marginBottom: 10 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#00008B',
          textDecoration: 'underline', letterSpacing: 1, marginBottom: 6,
        }}>
          DELIVERY CHALLAN / ON APPROVAL MEMO
        </div>

        {/* Logo + No/Date row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            fontSize: 36, fontWeight: 900, color: '#00008B',
            fontFamily: 'Georgia, serif', border: '2px solid #00008B',
            padding: '4px 12px', lineHeight: 1,
          }}>
            {(profile?.business_name || 'Business').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>NO.</span>
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
                {String(bill.bill_number).padStart(3, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>DATE :</span>
              <span style={{ borderBottom: '1px solid #000', minWidth: 80, textAlign: 'center' }}>
                {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: 12, fontSize: 11 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontWeight: 700, minWidth: 30 }}>M/s.</span>
          <span style={{ borderBottom: '1px solid #000', flex: 1, minHeight: 18, fontWeight: 600 }}>
            {bill.customer_name}
          </span>
        </div>
        {bill.customer_address && (
          <div style={{ marginTop: 4, paddingLeft: 36, fontSize: 10, color: '#444' }}>
            {bill.customer_address}
          </div>
        )}
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #00008B' }}>
        <thead>
          <tr style={{ background: '#f0f0ff' }}>
            <th style={{ border: '1px solid #00008B', padding: '5px 8px', textAlign: 'center', fontWeight: 700, width: '65%' }}>
              PARTICULARS
            </th>
            <th style={{ border: '1px solid #00008B', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              Rs.
            </th>
          </tr>
        </thead>
        <tbody>
          {(bill.items || []).map((item, i) => (
            <tr key={item.id || i}>
              <td style={{ border: '1px solid #00008B', padding: '4px 8px', fontSize: 11 }}>
                {item.product_name}
                {item.quantity && item.rate ? (
                  <span style={{ color: '#666', fontSize: 10 }}> [{fmt(item.quantity, 0)} × ₹{fmt(item.rate)}{item.discount_pct ? ` - ${item.discount_pct}%` : ''}]</span>
                ) : null}
              </td>
              <td style={{ border: '1px solid #00008B', padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                {fmt(item.amount)}
              </td>
            </tr>
          ))}
          {/* Empty rows */}
          {Array.from({ length: Math.max(0, 10 - (bill.items?.length || 0)) }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td style={{ border: '1px solid #00008B', padding: '4px 8px', height: 24 }}></td>
              <td style={{ border: '1px solid #00008B', padding: '4px 8px' }}></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ border: '1px solid #00008B', padding: '5px 8px', fontWeight: 900, fontSize: 12 }}>
              <span style={{ fontStyle: 'italic' }}>Thank You</span>
              <span style={{ float: 'right', fontStyle: 'normal' }}>TOTAL</span>
            </td>
            <td style={{ border: '1px solid #00008B', padding: '5px 8px', textAlign: 'right', fontWeight: 900, fontFamily: 'monospace' }}>
              {fmt(bill.grand_total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#00008B', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700 }}>GSTIN NO.: {profile?.gstin || '27CXSPS8629A1ZV'}</div>
        <div>Goods once sold will not be taken back or Exchanged.</div>
        <div>No Guarantee for Bubble &amp; Crack.</div>
        <div>No Return | No Exchange</div>
      </div>

      {bill.notes && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#555' }}>
          Note: {bill.notes}
        </div>
      )}
    </div>
  )
}
