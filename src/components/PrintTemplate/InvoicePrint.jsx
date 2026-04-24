import { numberToWords } from '../../lib/numberToWords'

const f2 = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
const f0 = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)

// Total 15 rows visible in the items section (like a preprinted form)
const ITEM_ROWS = 15

const cell = (extra = {}) => ({
  border: '1px solid #000',
  padding: '4px 6px',
  fontSize: 11,
  ...extra,
})

export default function InvoicePrint({ bill, profile }) {
  if (!bill || !profile) return null

  const items     = bill.items || []
  const subtotal  = bill.subtotal  || 0
  const totalGst  = bill.total_gst || 0
  const grandTotal = bill.grand_total || 0

  // Per-item GST rate (use first item; in practice all items have same rate for simplicity)
  const gstRate  = items[0]?.gst_rate ?? 18
  const halfGst  = gstRate / 2

  const centralTax = parseFloat((totalGst / 2).toFixed(2))
  const stateTax   = parseFloat((totalGst / 2).toFixed(2))
  const roundOff   = bill.round_off ?? parseFloat((grandTotal - (subtotal + totalGst)).toFixed(2))

  // Empty rows to pad the table
  const emptyRows = Math.max(0, ITEM_ROWS - items.length)

  const dateStr = new Date(bill.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 11,
      color: '#000',
      background: '#fff',
      width: 794,          // A4 width in px at 96dpi ≈ 210mm
      minHeight: 1123,     // A4 height in px
      padding: '18px 22px',
      boxSizing: 'border-box',
    }}>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#cc0066', letterSpacing: 1, marginBottom: 3 }}>
          {profile.business_name?.toUpperCase()}
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.7 }}>
          {profile.address}
        </div>
        <div style={{ fontSize: 10 }}>
          {profile.phone && profile.phone}{profile.email && `,EMAIL-${profile.email}`}
        </div>
      </div>

      {/* ══ DEBIT MEMO / TAX INVOICE / ORIGINAL ═════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>
        <tbody>
          <tr>
            <td style={{ padding: '3px 6px', fontSize: 11, fontWeight: 700, width: '20%' }}>Debit Memo</td>
            <td style={{ padding: '3px 6px', fontSize: 13, fontWeight: 900, textAlign: 'center', letterSpacing: 2, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
              TAX INVOICE
            </td>
            <td style={{ padding: '3px 6px', fontSize: 11, fontWeight: 700, width: '15%', textAlign: 'right' }}>Original</td>
          </tr>
        </tbody>
      </table>

      {/* ══ CUSTOMER + INVOICE META ══════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            {/* Left: Customer */}
            <td style={{ ...cell(), borderTop: 'none', verticalAlign: 'top', width: '65%', paddingBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 700 }}>M/s. : </span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{bill.customer_name}</span>
              </div>
              {bill.customer_address && (
                <div style={{ marginTop: 2, lineHeight: 1.6, fontSize: 11 }}>
                  {bill.customer_address}
                </div>
              )}
              <div style={{ marginTop: 4 }}>Place of Supply : {bill.place_of_supply || '27-Maharashtra'}</div>
              {bill.customer_gstin && (
                <div>GSTIN No. : <strong>{bill.customer_gstin}</strong></div>
              )}
            </td>

            {/* Right: Invoice details */}
            <td style={{ ...cell(), borderTop: 'none', verticalAlign: 'top', width: '35%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 6, paddingRight: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>Invoice No.</td>
                    <td style={{ paddingBottom: 6 }}>: &nbsp;<strong>{String(bill.bill_number).padStart(3, '0')}</strong></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Date</td>
                    <td>: &nbsp;<strong>{dateStr}</strong></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ ITEMS TABLE ══════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
        {/* Column header */}
        <thead>
          <tr style={{ background: '#f7f7f7' }}>
            <th style={{ ...cell({ textAlign: 'center', fontWeight: 700, width: 36, whiteSpace: 'nowrap' }) }}>SrNo</th>
            <th style={{ ...cell({ fontWeight: 700 }) }}>Product Name</th>
            <th style={{ ...cell({ textAlign: 'center', fontWeight: 700, width: 72, whiteSpace: 'nowrap' }) }}>HSN/SAC</th>
            <th style={{ ...cell({ textAlign: 'right', fontWeight: 700, width: 64, whiteSpace: 'nowrap' }) }}>Qty</th>
            <th style={{ ...cell({ textAlign: 'right', fontWeight: 700, width: 70, whiteSpace: 'nowrap' }) }}>Rate</th>
            <th style={{ ...cell({ textAlign: 'center', fontWeight: 700, width: 52, whiteSpace: 'nowrap' }) }}>GST %</th>
            <th style={{ ...cell({ textAlign: 'right', fontWeight: 700, width: 80, whiteSpace: 'nowrap' }) }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Actual items */}
          {items.map((item, i) => (
            <tr key={item.id || i}>
              <td style={{ ...cell({ textAlign: 'center', height: 24 }) }}>{i + 1}</td>
              <td style={{ ...cell({ fontWeight: 500 }) }}>{item.product_name}</td>
              <td style={{ ...cell({ textAlign: 'center', fontFamily: 'monospace' }) }}>{item.hsn_sac || ''}</td>
              <td style={{ ...cell({ textAlign: 'right' }) }}>
                {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(item.quantity)}
              </td>
              <td style={{ ...cell({ textAlign: 'right' }) }}>{f2(item.rate)}</td>
              <td style={{ ...cell({ textAlign: 'center' }) }}>{Number(item.gst_rate).toFixed(2)}</td>
              <td style={{ ...cell({ textAlign: 'right', fontWeight: 600 }) }}>
                {/* Amount shown without GST (taxable) then grand with GST */}
                {f2(item.quantity * item.rate)}
              </td>
            </tr>
          ))}

          {/* Empty rows to mirror a preprinted form look */}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e${i}`}>
              <td style={{ ...cell({ height: 22 }) }}></td>
              <td style={{ ...cell() }}></td>
              <td style={{ ...cell() }}></td>
              <td style={{ ...cell() }}></td>
              <td style={{ ...cell() }}></td>
              <td style={{ ...cell() }}></td>
              <td style={{ ...cell() }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ══ FOOTER: Bank + Terms | Tax Summary ══════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            {/* LEFT: GSTIN, Bank, Words, Terms */}
            <td style={{ ...cell({ verticalAlign: 'top', width: '62%', borderTop: 'none', padding: '8px 10px', lineHeight: 1.8, fontSize: 10 }) }}>

              {/* GSTIN */}
              <div style={{ fontWeight: 900, fontSize: 11, marginBottom: 4 }}>
                GSTIN No.: {profile.gstin}
              </div>

              {/* Bank */}
              {profile.bank_name && (
                <table style={{ borderCollapse: 'collapse', fontSize: 10, marginBottom: 4 }}>
                  <tbody>
                    {[
                      ['Bank Name', profile.bank_name],
                      ['Bank A/c. No.', profile.bank_account],
                      ['RTGS/IFSC Code', profile.ifsc_code],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap' }}>{k}</td>
                        <td>: &nbsp;{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Amount in words */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: 4, marginTop: 2 }}>
                <strong>Total GST :</strong> {numberToWords(centralTax + stateTax)}
              </div>
              <div>
                <strong>Bill Amount :</strong> {numberToWords(grandTotal)}
              </div>

              {/* Note */}
              {bill.notes && (
                <div style={{ marginTop: 4 }}>
                  <strong>Note :</strong> {bill.notes}
                </div>
              )}

              {/* Terms */}
              <div style={{ marginTop: 8, fontSize: 9.5, borderTop: '1px solid #eee', paddingTop: 6 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Terms &amp; Condition :</div>
                <div>1. Goods once sold will not be taken back.</div>
                <div>2. Interest @18% p.a. will be charged if payment is not made within due date.</div>
                <div>3. Our risk and responsibility ceases as soon as the goods leave our premises.</div>
                <div>4. "Subject to 'MUMBAI' Jurisdiction only. E.&amp;O.E"</div>
              </div>
            </td>

            {/* RIGHT: Tax Summary */}
            <td style={{ ...cell({ verticalAlign: 'top', borderTop: 'none', padding: '8px 12px', fontSize: 11 }) }}>

              {/* Sub Total */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 6, borderBottom: '1px solid #ccc', paddingRight: 12 }}>Sub Total</td>
                    <td style={{ paddingBottom: 6, borderBottom: '1px solid #ccc', textAlign: 'right', fontFamily: 'monospace' }}>
                      {f2(subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Taxable breakdown */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid #ccc', paddingRight: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Taxable Amount</span>
                        <span style={{ fontFamily: 'monospace' }}>{f2(subtotal)}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #eee' }}>Central Tax</td>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #eee', textAlign: 'right', fontFamily: 'monospace', paddingLeft: 8 }}>
                      <span style={{ color: '#555', marginRight: 8 }}>{halfGst.toFixed(2)}%</span>{f2(centralTax)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #eee' }}>State/UT Tax</td>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #eee', textAlign: 'right', fontFamily: 'monospace', paddingLeft: 8 }}>
                      <span style={{ color: '#555', marginRight: 8 }}>{halfGst.toFixed(2)}%</span>{f2(stateTax)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #ccc' }}>Round Off</td>
                    <td style={{ padding: '3px 0', borderBottom: '1px solid #ccc', textAlign: 'right', fontFamily: 'monospace' }}>
                      {roundOff >= 0 ? '' : '-'}{f2(Math.abs(roundOff))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Grand Total */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
                <tbody>
                  <tr style={{ borderTop: '2px solid #000' }}>
                    <td style={{ paddingTop: 6, fontWeight: 900, fontSize: 13 }}>Grand Total</td>
                    <td style={{ paddingTop: 6, fontWeight: 900, fontSize: 14, textAlign: 'right', fontFamily: 'monospace' }}>
                      {f2(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatory */}
              <div style={{ marginTop: 40, textAlign: 'right', fontSize: 11 }}>
                <div>For, {profile.business_name}</div>
                <div style={{ marginTop: 32, borderTop: '1px solid #000', paddingTop: 4, textAlign: 'center', fontSize: 10 }}>
                  (Authorised Signatory)
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
