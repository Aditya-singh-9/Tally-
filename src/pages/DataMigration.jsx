import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Upload, Database, CheckCircle, AlertTriangle, FileText, ArrowRight, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

export default function DataMigration() {
  const { addParty, addProduct } = useApp()
  const [file, setFile] = useState(null)
  const [dataPreview, setDataPreview] = useState([])
  const [importType, setImportType] = useState('parties') // 'parties' or 'products'
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const fileInputRef = useRef(null)

  function logMsg(msg, type='info') {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-IN', { hour12: false }), msg, type }])
  }

  async function handleFileUpload(e) {
    const uploaded = e.target.files[0]
    if (!uploaded) return
    setFile(uploaded)
    setDataPreview([])
    setLogs([])
    setLoading(true)

    try {
      const ext = uploaded.name.split('.').pop().toLowerCase()
      
      if (ext === 'zip') {
        logMsg('Extracting ZIP archive...')
        const zip = await JSZip.loadAsync(uploaded)
        let foundData = false
        
        for (const relativePath in zip.files) {
          if (!zip.files[relativePath].dir) {
            const innerExt = relativePath.split('.').pop().toLowerCase()
            if (['xlsx', 'xls', 'csv'].includes(innerExt)) {
              logMsg(`Found Excel/CSV inside zip: ${relativePath}`)
              const content = await zip.files[relativePath].async('arraybuffer')
              const workbook = XLSX.read(content, { type: 'array' })
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
              const jsonData = XLSX.utils.sheet_to_json(firstSheet)
              setDataPreview(jsonData)
              logMsg(`Successfully parsed ${jsonData.length} rows from ZIP.`, 'success')
              foundData = true
              break
            } else if (innerExt === 'xml') {
              logMsg(`Found XML inside zip: ${relativePath}`)
              const content = await zip.files[relativePath].async('string')
              parseXMLData(content)
              foundData = true
              break
            }
          }
        }
        if (!foundData) throw new Error('No valid Excel, CSV, or XML spreadsheets found in the ZIP.')
      } else if (ext === 'xml') {
        logMsg('Parsing XML file...')
        const text = await uploaded.text()
        parseXMLData(text)
      } else {
        // Direct Excel / CSV
        logMsg(`Reading Excel/CSV file: ${uploaded.name}`)
        const buffer = await uploaded.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        setDataPreview(jsonData)
        logMsg(`Successfully parsed ${jsonData.length} rows.`, 'success')
      }
    } catch (err) {
      logMsg(err.message, 'error')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function parseXMLData(xmlString) {
    try {
      const parser = new XMLParser({ ignoreAttributes: false })
      const jsonObj = parser.parse(xmlString)
      logMsg('Tally XML loaded. Converting to flat data representation...', 'info')
      
      let flatArray = []
      // Attempt to drill down into Tally Master XML
      try {
        const messages = jsonObj?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || []
        const msgs = Array.isArray(messages) ? messages : [messages]
        
        msgs.forEach(msg => {
          if (msg.LEDGER) flatArray.push({ 'Name': msg.LEDGER.NAME || msg.LEDGER['@_NAME'], 'Group': msg.LEDGER.PARENT, 'Type': 'Ledger' })
          if (msg.STOCKITEM) flatArray.push({ 'Name': msg.STOCKITEM.NAME || msg.STOCKITEM['@_NAME'], 'Group': msg.STOCKITEM.PARENT, 'Type': 'Stock Item' })
        })
      } catch (e) {
        flatArray = [{ _rawXML: "Parsed Structure", ...jsonObj }]
      }

      if (flatArray.length > 0) {
        setDataPreview(flatArray)
        logMsg(`Successfully extracted ${flatArray.length} records from XML.`, 'success')
      } else {
        logMsg('Could not find recognizable Tally records in this XML.', 'warning')
      }
    } catch (e) {
      logMsg('Failed to parse XML: ' + e.message, 'error')
    }
  }

  async function executeImport() {
    if (dataPreview.length === 0) return alert('No data to import')
    if (!window.confirm(`Are you sure you want to import ${dataPreview.length} records into your live database?`)) return

    setLoading(true)
    logMsg(`Starting import of ${dataPreview.length} ${importType}...`)
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < dataPreview.length; i++) {
      const row = dataPreview[i]
      try {
        if (importType === 'parties') {
          // Smart column mapping
          const name = row['Party Name'] || row['Name'] || row['LEDGERNAME'] || row['Customer Name'] || row['Supplier Name'] || Object.values(row)[0]
          if (!name) { failCount++; continue }
          
          const group = String(row['Type'] || row['Group'] || row['Parent'] || '').toLowerCase()
          const isSupplier = group.includes('creditor') || group.includes('supplier') || group.includes('purchase')
          
          await addParty({
            name: String(name),
            type: isSupplier ? 'supplier' : 'customer',
            gstin: row['GSTIN'] || row['GSTIN/UIN'] || row['GST No'] || '',
            phone: row['Phone'] || row['Mobile'] || row['Contact'] || '',
            address: row['Address'] || row['Location'] || ''
          })
        } else if (importType === 'products') {
          const name = row['Item Name'] || row['Name'] || row['STOCKITEMNAME'] || row['Product Name'] || Object.values(row)[0]
          if (!name) { failCount++; continue }
          
          await addProduct({
            name: String(name),
            category: row['Category'] || row['Group'] || 'Imported',
            hsn_sac: String(row['HSN'] || row['HSN/SAC'] || row['HSN Code'] || ''),
            price: parseFloat(row['Rate'] || row['Price'] || row['Standard Price'] || row['Sale Price'] || 0),
            gst_rate: parseFloat(row['GST Rate'] || row['GST%'] || row['Tax'] || 18),
            quantity: parseFloat(row['Quantity'] || row['Closing Balance'] || row['Qty'] || row['Stock'] || 0)
          })
        }
        successCount++
      } catch (err) {
        failCount++
        console.error('Row import failed', row, err)
      }
    }
    
    logMsg(`Import Complete! Added: ${successCount}. Failed: ${failCount}`, successCount > 0 ? 'success' : 'error')
    setLoading(false)
  }

  function clearData() {
    setFile(null)
    setDataPreview([])
    setLogs([])
  }

  return (
    <div className="page-content animate-fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--indigo), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Data Migration</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Import existing records from Tally ERP 9, Excel, or ZIP files.</p>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Col: Upload & Config */}
        <div>
          <div className="card mb-6">
            <h3 className="card-title mb-4">1. Select Target</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="target" checked={importType === 'parties'} onChange={() => setImportType('parties')} />
                <span>Parties (Customers & Suppliers)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="target" checked={importType === 'products'} onChange={() => setImportType('products')} />
                <span>Products (Inventory)</span>
              </label>
            </div>
          </div>

          <div className="card mb-6">
            <h3 className="card-title mb-4">2. Upload File</h3>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: '40px 20px',
                textAlign: 'center',
                cursor: loading ? 'wait' : 'pointer',
                background: file ? 'var(--bg-secondary)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx,.xls,.csv,.zip,.xml"
                onChange={handleFileUpload}
                disabled={loading}
              />
              
              {file ? (
                <div>
                  <FileText size={32} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  <button className="btn btn-ghost btn-sm mt-4" onClick={(e) => { e.stopPropagation(); clearData() }}>Clear Selection</button>
                </div>
              ) : (
                <div>
                  <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Click or Drag to Upload</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Supports .xlsx, .csv, and Tally .zip files</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">3. Execute Import</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              The system will automatically map common Tally headers (like 'Party Name', 'GSTIN', 'Closing Balance') to the correct database columns.
            </p>
            <button 
              className="btn btn-primary w-full" 
              style={{ padding: '12px', justifyContent: 'center' }}
              disabled={dataPreview.length === 0 || loading}
              onClick={executeImport}
            >
              {loading ? 'Processing...' : `Import ${dataPreview.length} ${importType === 'parties' ? 'Parties' : 'Products'} Now`} 
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* Right Col: Preview & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: 'calc(100vh - 140px)' }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Data Preview</h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {dataPreview.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {dataPreview.slice(0, 10).map((row, i) => (
                    <div key={i} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', fontSize: 13 }}>
                      {Object.entries(row).slice(0, 5).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', marginBottom: 4 }}>
                          <span style={{ width: 120, color: 'var(--text-muted)' }}>{k}:</span>
                          <span style={{ fontWeight: 500 }}>{String(v)}</span>
                        </div>
                      ))}
                      {Object.keys(row).length > 5 && <div style={{ color: 'var(--accent)', fontSize: 11, marginTop: 4 }}>+ {Object.keys(row).length - 5} more columns...</div>}
                    </div>
                  ))}
                  {dataPreview.length > 10 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>
                      ... and {dataPreview.length - 10} more rows ready to import.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Upload a file to see preview data here.
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ height: 250, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: 13 }}>Migration Logs</h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#111', fontFamily: 'var(--font-mono)' }}>
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} style={{ 
                    fontSize: 12, 
                    marginBottom: 8, 
                    color: log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#51cf66' : log.type === 'warning' ? '#fcc419' : '#a5d8ff' 
                  }}>
                    <span style={{ color: '#555', marginRight: 8 }}>[{log.time}]</span>
                    {log.msg}
                  </div>
                ))
              ) : (
                <div style={{ color: '#555', fontSize: 12 }}>System ready...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
