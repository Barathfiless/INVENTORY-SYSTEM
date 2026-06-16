import { useEffect, useState, useRef } from 'react';
import { TrendingUp, ShoppingCart, Package, Calendar, Filter, ChevronLeft, ChevronRight, X, Download, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { reportAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef(null);
  const downloadRef = useRef(null);
  const shareRef = useRef(null);
  const [itemsPerPage] = useState(10);
  const [toast, setToast] = useState(null);

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close filter/download/share popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownloadDropdown(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShareDropdown(false);
      }
    };
    if (showFilters || showDownloadDropdown || showShareDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showDownloadDropdown, showShareDropdown]);

  // CSV format generator
  const handleDownload = () => {
    if (!report) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "REPORT SUMMARY\r\n";
    csvContent += `Metric,Value,Count\r\n`;
    csvContent += `Purchases,${report.summary.purchaseTotal},${report.summary.purchaseCount}\r\n`;
    csvContent += `Sales,${report.summary.saleTotal},${report.summary.saleCount}\r\n`;
    csvContent += `Orders,${report.summary.orderTotal},${report.summary.orderCount}\r\n\r\n`;
    
    csvContent += "TOP SELLING PRODUCTS\r\n";
    csvContent += "Rank,Product,Qty Sold,Revenue\r\n";
    report.topProducts.forEach((p, index) => {
      csvContent += `${index + 1},"${p.name.replace(/"/g, '""')}",${p.totalQty},${p.revenue}\r\n`;
    });
    csvContent += "\r\n";

    csvContent += "RECENT SALES\r\n";
    csvContent += "S.No,Date,Product,Amount\r\n";
    report.sales.forEach((s, index) => {
      const formattedDate = new Date(s.createdAt).toLocaleDateString();
      csvContent += `${index + 1},${formattedDate},"${(s.product?.name || 'Unknown Product').replace(/"/g, '""')}",${s.totalAmount}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stocksync_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToastMessage("Report CSV downloaded successfully!");
  };

  // PDF format generator helper
  const generatePDF = () => {
    if (!report) return null;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("StockSync Report", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    const dateStr = `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    doc.text(dateStr, 15, 26);
    
    // Draw line
    doc.setDrawColor(234, 234, 234);
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);
    
    // Summary Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Report Summary", 15, 38);
    
    // Summary Cards
    const cardW = 56;
    const cardH = 22;
    const startY = 43;
    
    // Purchases Card
    doc.setDrawColor(0, 112, 243, 51); // 0.2 alpha
    doc.setFillColor(240, 247, 255);
    doc.roundedRect(15, startY, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(`Purchases (${report.summary.purchaseCount})`, 19, startY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 112, 243);
    doc.text(formatCurrency(report.summary.purchaseTotal), 19, startY + 15);
    
    // Sales Card
    doc.setDrawColor(34, 197, 94, 51);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15 + cardW + 6, startY, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(`Sales (${report.summary.saleCount})`, 15 + cardW + 10, startY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(report.summary.saleTotal), 15 + cardW + 10, startY + 15);
    
    // Orders Card
    doc.setDrawColor(139, 92, 246, 51);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(15 + (cardW + 6) * 2, startY, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(`Orders (${report.summary.orderCount})`, 15 + (cardW + 6) * 2 + 4, startY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(139, 92, 246);
    doc.text(formatCurrency(report.summary.orderTotal), 15 + (cardW + 6) * 2 + 4, startY + 15);
    
    // Top Products Title
    let currentY = startY + cardH + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Top Selling Products", 15, currentY);
    
    // Table Headers
    currentY += 5;
    doc.setFillColor(250, 250, 250);
    doc.rect(15, currentY, 180, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text("Rank", 18, currentY + 5.5);
    doc.text("Product Name", 35, currentY + 5.5);
    doc.text("Qty Sold", 130, currentY + 5.5);
    doc.text("Revenue", 165, currentY + 5.5);
    
    // Table Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    report.topProducts.forEach((p, index) => {
      currentY += 8;
      if (index % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(15, currentY, 180, 8, "F");
      }
      doc.text(`${index + 1}`, 18, currentY + 5.5);
      let name = p.name;
      if (name.length > 38) name = name.substring(0, 35) + "...";
      doc.text(name, 35, currentY + 5.5);
      doc.text(`${p.totalQty}`, 130, currentY + 5.5);
      doc.text(formatCurrency(p.revenue), 165, currentY + 5.5);
    });
    
    // Recent Sales Title
    currentY += 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Recent Sales", 15, currentY);
    
    // Table Headers
    currentY += 5;
    doc.setFillColor(250, 250, 250);
    doc.rect(15, currentY, 180, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text("S.No", 18, currentY + 5.5);
    doc.text("Date", 35, currentY + 5.5);
    doc.text("Product Name", 75, currentY + 5.5);
    doc.text("Amount", 165, currentY + 5.5);
    
    // Table Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const pdfSales = report.sales.slice(0, 12);
    pdfSales.forEach((s, index) => {
      currentY += 8;
      if (index % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(15, currentY, 180, 8, "F");
      }
      doc.text(`${index + 1}`, 18, currentY + 5.5);
      doc.text(new Date(s.createdAt).toLocaleDateString(), 35, currentY + 5.5);
      let prodName = s.product?.name || "Unknown Product";
      if (prodName.length > 38) prodName = prodName.substring(0, 35) + "...";
      doc.text(prodName, 75, currentY + 5.5);
      doc.text(formatCurrency(s.totalAmount), 165, currentY + 5.5);
    });
    
    return doc;
  };

  // DOCX format generator HTML helper
  const generateDocx = () => {
    if (!report) return "";
    
    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>StockSync Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.6; }
          h1 { color: #000000; font-size: 24px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
          h2 { color: #333333; font-size: 18px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #eaeaea; padding: 8px 12px; text-align: left; }
          th { background-color: #fafafa; font-weight: bold; }
          .summary-card { padding: 15px; border: 1px solid #eaeaea; margin-bottom: 10px; border-radius: 6px; }
          .value { font-size: 20px; font-weight: bold; color: #0070f3; }
        </style>
      </head>
      <body>
        <h1>StockSync Report - ${new Date().toLocaleDateString()}</h1>
        <h2>Summary Stats</h2>
        <div class="summary-card">
          <div>Purchases: <span class="value">${formatCurrency(report.summary.purchaseTotal)}</span> (${report.summary.purchaseCount} purchases)</div>
          <div>Sales: <span class="value">${formatCurrency(report.summary.saleTotal)}</span> (${report.summary.saleCount} sales)</div>
          <div>Orders: <span class="value">${formatCurrency(report.summary.orderTotal)}</span> (${report.summary.orderCount} orders)</div>
        </div>
        
        <h2>Top Selling Products</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product Name</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${report.topProducts.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.totalQty}</td>
                <td>${formatCurrency(p.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recent Sales</h2>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Product Name</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${report.sales.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${new Date(s.createdAt).toLocaleDateString()}</td>
                <td>${s.product?.name || 'Unknown Product'}</td>
                <td>${formatCurrency(s.totalAmount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = () => {
    const doc = generatePDF();
    if (!doc) return;
    doc.save(`stocksync_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToastMessage("PDF Report downloaded successfully!");
  };

  const handleDownloadDocx = () => {
    const docxContent = generateDocx();
    if (!docxContent) return;
    const blob = new Blob(['\ufeff' + docxContent], { type: 'application/msword' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stocksync_report_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMessage("DOCX Report downloaded successfully!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToastMessage("Report link copied to clipboard!");
  };

  const handleSharePDF = async () => {
    const doc = generatePDF();
    if (!doc) return;
    const blob = doc.output('blob');
    const file = new File([blob], `stocksync_report_${new Date().toISOString().split('T')[0]}.pdf`, { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'StockSync PDF Report',
          text: 'Here is the latest StockSync PDF report.'
        });
        showToastMessage("Report PDF shared successfully!");
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToastMessage("Failed to share PDF: " + err.message, "error");
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToastMessage("Web Share not supported. Link copied to clipboard!");
    }
  };

  const handleShareDocx = async () => {
    const docxContent = generateDocx();
    if (!docxContent) return;
    const blob = new Blob(['\ufeff' + docxContent], { type: 'application/msword' });
    const file = new File([blob], `stocksync_report_${new Date().toISOString().split('T')[0]}.docx`, { type: 'application/msword' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'StockSync DOCX Report',
          text: 'Here is the latest StockSync DOCX report.'
        });
        showToastMessage("Report DOCX shared successfully!");
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToastMessage("Failed to share DOCX: " + err.message, "error");
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToastMessage("Web Share not supported. Link copied to clipboard!");
    }
  };


  const load = async () => {
    const params = {};
    if (range.startDate) params.startDate = range.startDate;
    if (range.endDate) params.endDate = range.endDate;
    const { data } = await reportAPI.getReports(params);
    setReport(data);
  };

  useEffect(() => { load(); }, []);

  // Pagination for recent sales
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = report?.sales.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((report?.sales.length || 0) / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page reports-page">
      {report && (
        <>
          <div className="reports-top-bar">
            {/* Summary Stats */}
            <ul className="stats-grid compact">
              <li className="stat-card stat-card--blue">
                <span className="stat-icon-wrap">
                  <Package size={20} strokeWidth={2} aria-hidden />
                </span>
                <p className="stat-value">{formatCurrency(report.summary.purchaseTotal)}</p>
                <p className="stat-label">Purchases ({report.summary.purchaseCount})</p>
              </li>
              <li className="stat-card stat-card--green">
                <span className="stat-icon-wrap">
                  <TrendingUp size={20} strokeWidth={2} aria-hidden />
                </span>
                <p className="stat-value">{formatCurrency(report.summary.saleTotal)}</p>
                <p className="stat-label">Sales ({report.summary.saleCount})</p>
              </li>
              <li className="stat-card stat-card--purple">
                <span className="stat-icon-wrap">
                  <ShoppingCart size={20} strokeWidth={2} aria-hidden />
                </span>
                <p className="stat-value">{formatCurrency(report.summary.orderTotal)}</p>
                <p className="stat-label">Orders ({report.summary.orderCount})</p>
              </li>
            </ul>

            {/* Filter Section */}
            <div className="page-header-actions">
              {/* Download Option Popover */}
              <div className="filter-popover-wrap" ref={downloadRef}>
                <button 
                  className={`btn-action${showDownloadDropdown ? ' btn-action--active' : ''}`}
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  title="Download Report"
                >
                  <Download size={16} />
                  Download
                </button>

                {showDownloadDropdown && (
                  <div className="filter-popover format-popover">
                    <div className="filter-popover-header">
                      <span>Download Report</span>
                      <button className="filter-popover-close" onClick={() => setShowDownloadDropdown(false)} aria-label="Close format options">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="format-options">
                      <button type="button" className="format-option-btn" onClick={() => { handleDownloadPDF(); setShowDownloadDropdown(false); }}>
                        <span className="format-badge format-badge--pdf">PDF</span>
                        <div className="format-details">
                          <div className="format-title">Download PDF</div>
                          <div className="format-desc">Best for printing and official reports</div>
                        </div>
                      </button>
                      <button type="button" className="format-option-btn" onClick={() => { handleDownloadDocx(); setShowDownloadDropdown(false); }}>
                        <span className="format-badge format-badge--docx">DOCX</span>
                        <div className="format-details">
                          <div className="format-title">Download DOCX</div>
                          <div className="format-desc">Best for editing in Microsoft Word</div>
                        </div>
                      </button>
                      <button type="button" className="format-option-btn" onClick={() => { handleDownload(); setShowDownloadDropdown(false); }}>
                        <span className="format-badge format-badge--csv">CSV</span>
                        <div className="format-details">
                          <div className="format-title">Download CSV</div>
                          <div className="format-desc">Raw tabular data for Excel analysis</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Share Option Popover */}
              <div className="filter-popover-wrap" ref={shareRef}>
                <button 
                  className={`btn-action${showShareDropdown ? ' btn-action--active' : ''}`}
                  onClick={() => setShowShareDropdown(!showShareDropdown)}
                  title="Share Report"
                >
                  <Share2 size={16} />
                  Share
                </button>

                {showShareDropdown && (
                  <div className="filter-popover format-popover">
                    <div className="filter-popover-header">
                      <span>Share Report</span>
                      <button className="filter-popover-close" onClick={() => setShowShareDropdown(false)} aria-label="Close share options">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="format-options">
                      <button type="button" className="format-option-btn" onClick={() => { handleSharePDF(); setShowShareDropdown(false); }}>
                        <span className="format-badge format-badge--pdf">PDF</span>
                        <div className="format-details">
                          <div className="format-title">Share PDF Document</div>
                          <div className="format-desc">Send official PDF report to external apps</div>
                        </div>
                      </button>
                      <button type="button" className="format-option-btn" onClick={() => { handleShareDocx(); setShowShareDropdown(false); }}>
                        <span className="format-badge format-badge--docx">DOCX</span>
                        <div className="format-details">
                          <div className="format-title">Share DOCX Document</div>
                          <div className="format-desc">Share editable Word format document</div>
                        </div>
                      </button>
                      <button type="button" className="format-option-btn" onClick={() => { handleShare(); setShowShareDropdown(false); }}>
                        <span className="format-badge format-badge--link">LINK</span>
                        <div className="format-details">
                          <div className="format-title">Share Page Link</div>
                          <div className="format-desc">Copy current report dashboard URL</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="filter-popover-wrap" ref={filterRef}>
                <button 
                  className={`btn-filter${showFilters ? ' btn-filter--active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={16} />
                  Filters
                </button>

                {showFilters && (
                  <div className="filter-popover">
                    <div className="filter-popover-header">
                      <span>Date Range</span>
                      <button className="filter-popover-close" onClick={() => setShowFilters(false)} aria-label="Close filters">
                        <X size={14} />
                      </button>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); load(); setShowFilters(false); }}>
                      <div className="filter-popover-fields">
                        <div className="filter-popover-field">
                          <label><Calendar size={13} /> From</label>
                          <input 
                            type="date" 
                            value={range.startDate} 
                            onChange={(e) => setRange({ ...range, startDate: e.target.value })} 
                          />
                        </div>
                        <div className="filter-popover-field">
                          <label><Calendar size={13} /> To</label>
                          <input 
                            type="date" 
                            value={range.endDate} 
                            onChange={(e) => setRange({ ...range, endDate: e.target.value })} 
                          />
                        </div>
                      </div>
                      <div className="filter-popover-actions">
                        <button 
                          type="button" 
                          className="filter-popover-clear"
                          onClick={() => { setRange({ startDate: '', endDate: '' }); }}
                        >
                          Clear
                        </button>
                        <button type="submit" className="filter-popover-apply">Apply</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="report-sections-grid">
            {/* Top Selling Products */}
            <div className="report-section">
              <h3 className="section-title">
                <TrendingUp size={20} />
                Top Selling Products
              </h3>
              <div className="table-container">
                <table className="data-table purchases-table reports-top-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.map((p, index) => (
                      <tr key={p._id}>
                        <td className="rank-cell">
                          {index + 1}
                        </td>
                        <td className="product-cell"><strong>{p.name}</strong></td>
                        <td className="qty-cell">
                          <span className="qty-badge">{p.totalQty}</span>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(p.revenue)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Sales */}
            <div className="report-section">
              <h3 className="section-title">
                <ShoppingCart size={20} />
                Recent Sales
              </h3>
              <div className="table-container">
                <table className="data-table purchases-table reports-recent-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSales.map((s, index) => (
                      <tr key={s._id}>
                        <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                        <td className="date-cell">{formatDate(s.createdAt)}</td>
                        <td className="product-cell"><strong>{s.product?.name}</strong></td>
                        <td className="total-cell">
                          <strong>{formatCurrency(s.totalAmount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {report.sales.length > itemsPerPage && (
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="pagination-btn"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}
