import { jsPDF } from 'jspdf'
import type { TeaSession } from '../types'

export interface MemberPdfBreakdown {
  memberName: string
  items: { name: string; quantity: number; price?: number }[]
  totalQty: number
  shareAmount: number
}

export interface PdfReportData {
  title: string
  groupName: string
  shopName: string
  dateTimeStr: string
  totalSpend: number
  membersCount: number
  totalItemsCount: number
  members: MemberPdfBreakdown[]
  noteText?: string
}

/**
 * Builds and downloads a ChaiSplit expense report PDF matching the user's exact specification.
 */
export function downloadExpensePdf(data: PdfReportData, filename?: string) {
  // Page setup: Standard A4 portrait in points (pt)
  // Dimensions: 595.28 x 841.89 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginX = 40
  const contentWidth = pageWidth - marginX * 2 // 515.28 pt

  let currentY = 48

  // 1. BRAND HEADER (Centered)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 35, 65) // Dark navy #0f2341
  doc.text('ChaiSplit', pageWidth / 2, currentY, { align: 'center' })

  currentY += 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // Slate #64748b
  doc.text('GROUP EXPENSE REPORT', pageWidth / 2, currentY, { align: 'center' })

  currentY += 20

  // 2. TOP INFO 2x2 GRID BOX
  const infoBoxHeight = 44
  const colHalf = contentWidth / 2

  // Top row background (warm soft cream/amber #fdfaf6)
  doc.setFillColor(253, 250, 246)
  doc.rect(marginX, currentY, contentWidth, 22, 'F')

  // Bottom row background (white)
  doc.setFillColor(255, 255, 255)
  doc.rect(marginX, currentY + 22, contentWidth, 22, 'F')

  // Box border and dividing lines
  doc.setDrawColor(226, 232, 240) // #e2e8f0
  doc.setLineWidth(0.8)
  doc.rect(marginX, currentY, contentWidth, infoBoxHeight)
  // Horizontal dividing line
  doc.line(marginX, currentY + 22, marginX + contentWidth, currentY + 22)
  // Vertical dividing line
  doc.line(marginX + colHalf, currentY, marginX + colHalf, currentY + infoBoxHeight)

  // Top row content (Bold, dark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42) // #0f172a
  doc.text(data.title, marginX + 10, currentY + 15)
  doc.text(data.groupName, marginX + colHalf + 10, currentY + 15)

  // Bottom row content (Muted slate)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105) // #475569
  doc.text(`Shop: ${data.shopName}`, marginX + 10, currentY + 36)
  doc.text(`Date & time: ${data.dateTimeStr}`, marginX + colHalf + 10, currentY + 36)

  currentY += infoBoxHeight + 14

  // 3. STAT SUMMARY 3-COLUMN BOX
  const statBoxHeight = 48
  const statColWidth = contentWidth / 3

  // Background
  doc.setFillColor(248, 250, 252) // #f8fafc
  doc.rect(marginX, currentY, contentWidth, statBoxHeight, 'F')

  // Border & vertical dividers
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.8)
  doc.rect(marginX, currentY, contentWidth, statBoxHeight)
  doc.line(marginX + statColWidth, currentY, marginX + statColWidth, currentY + statBoxHeight)
  doc.line(marginX + statColWidth * 2, currentY, marginX + statColWidth * 2, currentY + statBoxHeight)

  // Column 1: TOTAL SPEND
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('TOTAL SPEND', marginX + statColWidth / 2, currentY + 16, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(`Rs. ${data.totalSpend}`, marginX + statColWidth / 2, currentY + 36, { align: 'center' })

  // Column 2: MEMBERS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('MEMBERS', marginX + statColWidth * 1.5, currentY + 16, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(String(data.membersCount), marginX + statColWidth * 1.5, currentY + 36, { align: 'center' })

  // Column 3: ITEMS ORDERED
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('ITEMS ORDERED', marginX + statColWidth * 2.5, currentY + 16, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(String(data.totalItemsCount), marginX + statColWidth * 2.5, currentY + 36, { align: 'center' })

  currentY += statBoxHeight + 18

  // 4. SECTION HEADING: Member-wise breakdown
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(15, 35, 65)
  doc.text('Member-wise breakdown', marginX, currentY)

  currentY += 10

  // 5. TABLE HEADER
  const tableHeaderHeight = 22
  doc.setFillColor(10, 37, 64) // Dark Navy #0a2540
  doc.rect(marginX, currentY, contentWidth, tableHeaderHeight, 'F')

  // Columns layout:
  // Member: 40 -> 140 (width 100)
  // Items ordered: 140 -> 290 (width 150)
  // Qty: 290 -> 335 (width 45, center)
  // Unit price: 335 -> 395 (width 60, center)
  // Item total: 395 -> 465 (width 70, center)
  // Share: 465 -> 555 (width 90, right)
  const colMemberX = marginX + 8
  const colItemsX = marginX + 105
  const colQtyX = marginX + 270
  const colUnitPriceX = marginX + 330
  const colItemTotalX = marginX + 395
  const colShareRightX = marginX + contentWidth - 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text('Member', colMemberX, currentY + 14)
  doc.text('Items ordered', colItemsX, currentY + 14)
  doc.text('Qty', colQtyX, currentY + 14, { align: 'center' })
  doc.text('Unit price', colUnitPriceX, currentY + 14, { align: 'center' })
  doc.text('Item total', colItemTotalX, currentY + 14, { align: 'center' })
  doc.text('Share', colShareRightX, currentY + 14, { align: 'right' })

  currentY += tableHeaderHeight

  // 6. TABLE ROWS
  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.6)

  let currentPage = 1

  data.members.forEach((member, mIdx) => {
    const items = member.items.length > 0 ? member.items : [{ name: 'No items listed', quantity: 0 }]
    const rowHeight = Math.max(items.length * 14 + 10, 26)

    // Check for page overflow
    if (currentY + rowHeight > pageHeight - 75) {
      // Add page footer for current page
      drawPageFooter(doc, pageWidth, pageHeight, currentPage)
      doc.addPage()
      currentPage++
      currentY = 45

      // Re-render table header on new page
      doc.setFillColor(10, 37, 64)
      doc.rect(marginX, currentY, contentWidth, tableHeaderHeight, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.text('Member', colMemberX, currentY + 14)
      doc.text('Items ordered', colItemsX, currentY + 14)
      doc.text('Qty', colQtyX, currentY + 14, { align: 'center' })
      doc.text('Unit price', colUnitPriceX, currentY + 14, { align: 'center' })
      doc.text('Item total', colItemTotalX, currentY + 14, { align: 'center' })
      doc.text('Share', colShareRightX, currentY + 14, { align: 'right' })
      currentY += tableHeaderHeight
    }

    // Row alternating background
    if (mIdx % 2 === 1) {
      doc.setFillColor(250, 250, 252)
      doc.rect(marginX, currentY, contentWidth, rowHeight, 'F')
    }

    // Member name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 23, 42)
    doc.text(member.memberName, colMemberX, currentY + 15)

    // Member's share
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`Rs. ${member.shareAmount}`, colShareRightX, currentY + 15, { align: 'right' })

    // Render each item ordered
    items.forEach((it, iIdx) => {
      const itemY = currentY + 15 + iIdx * 14

      // Item name with bullet
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(51, 65, 85)
      doc.text(`• ${it.name}`, colItemsX, itemY)

      // Qty
      doc.text(String(it.quantity || 1), colQtyX, itemY, { align: 'center' })

      // Unit price
      const unitPriceStr = it.price != null && it.price > 0 ? `Rs. ${it.price}` : '—'
      doc.text(unitPriceStr, colUnitPriceX, itemY, { align: 'center' })

      // Item total
      const itemTotalStr = it.price != null && it.price > 0 ? `Rs. ${it.price * (it.quantity || 1)}` : '—'
      doc.text(itemTotalStr, colItemTotalX, itemY, { align: 'center' })
    })

    currentY += rowHeight

    // Row bottom border
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(marginX, currentY, marginX + contentWidth, currentY)
  })

  // 7. TOTAL SUMMARY ROW
  const totalRowHeight = 24
  doc.setFillColor(248, 250, 252)
  doc.rect(marginX, currentY, contentWidth, totalRowHeight, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text('TOTAL', colMemberX, currentY + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('All member items', colItemsX, currentY + 16)

  doc.setFont('helvetica', 'bold')
  doc.text(String(data.totalItemsCount), colQtyX, currentY + 16, { align: 'center' })
  doc.text('—', colUnitPriceX, currentY + 16, { align: 'center' })
  doc.text('—', colItemTotalX, currentY + 16, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`Rs. ${data.totalSpend}`, colShareRightX, currentY + 16, { align: 'right' })

  currentY += totalRowHeight

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.8)
  doc.line(marginX, currentY, marginX + contentWidth, currentY)

  currentY += 16

  // 8. NOTE BOX
  const defaultNote =
    data.noteText ||
    'Note: The source export contains member totals and item quantities, but not individual item prices. Unit price and item total are left blank to avoid guessing.'

  // Measure note text wrapping
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const splitNote = doc.splitTextToSize(defaultNote, contentWidth - 16)
  const noteHeight = splitNote.length * 10 + 12

  doc.setFillColor(252, 252, 253)
  doc.rect(marginX, currentY, contentWidth, noteHeight, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.6)
  doc.rect(marginX, currentY, contentWidth, noteHeight)

  doc.setTextColor(100, 116, 139)
  doc.text(splitNote, marginX + 8, currentY + 12)

  // 9. FOOTER (at bottom of page)
  drawPageFooter(doc, pageWidth, pageHeight, currentPage)

  // Save the PDF
  const finalFilename = filename || `ChaiSplit_Expense_Report_${Date.now()}.pdf`
  doc.save(finalFilename)
}

function drawPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number) {
  const marginX = 40
  const footerY = pageHeight - 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184) // #94a3b8

  // Left
  doc.text('ChaiSplit • Group expense report', marginX, footerY)

  // Right
  doc.text(`Page ${pageNumber}`, pageWidth - marginX, footerY, { align: 'right' })
}

/**
 * Convenience helper to export a single TeaSession using the template
 */
export function downloadSingleSessionPdf(session: TeaSession) {
  const totalItemsCount = session.expenses.reduce(
    (sum, e) => sum + e.items.reduce((s, it) => s + (it.quantity || 1), 0),
    0
  )

  let dateTimeStr = session.createdAt || 'Settled'
  if (session.rawCreatedAt) {
    const d = new Date(session.rawCreatedAt)
    if (!isNaN(d.getTime())) {
      dateTimeStr = d.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const members: MemberPdfBreakdown[] = session.expenses.map(e => ({
    memberName: e.memberName,
    items: e.items.map(it => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price
    })),
    totalQty: e.items.reduce((sum, it) => sum + it.quantity, 0),
    shareAmount: e.total
  }))

  const hasItemPrices = session.expenses.some(e => e.items.some(it => it.price != null && it.price > 0))
  const noteText = hasItemPrices
    ? 'Note: Individual item prices and member shares have been verified and settled via ChaiSplit.'
    : 'Note: The source export contains member totals and item quantities, but not individual item prices. Unit price and item total are left blank to avoid guessing.'

  const cleanTitle = (session.title || 'Tea_Break').replace(/[^a-zA-Z0-9_-]/g, '_')

  downloadExpensePdf(
    {
      title: session.title,
      groupName: session.groupName || 'Chai Group',
      shopName: session.shopName || 'Local Tea Shop',
      dateTimeStr,
      totalSpend: session.totalAmount,
      membersCount: session.expenses.length,
      totalItemsCount,
      members,
      noteText
    },
    `ChaiSplit_Receipt_${cleanTitle}.pdf`
  )
}
