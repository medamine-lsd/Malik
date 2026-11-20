/**
 * excel-export.js — Générateur officiel du classeur Excel AURA (3 feuilles conformes).
 * Chargé à la demande pour préserver les performances de démarrage de l'appli.
 * Reçoit : { medecinsVisites, pharmaciesVisites, portefeuilleMedecins, produits, delegueNom, dateDebut, dateFin }.
 * Renvoie : { blob, filename } prêt pour téléchargement ou partage.
 */
import { EXCEL_CONFIG, getContrastTextColor } from '../../config/excel-config.js';

export async function generateAuraExcelWorkbook({
  medecinsVisites = [],
  pharmaciesVisites = [],
  portefeuilleMedecins = [],
  produits = [],
  delegueNom = 'Amine',
  dateDebut = '',
  dateFin = ''
} = {}) {
  // Chargement différé d'ExcelJS à la demande
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aura Report Auto';
  workbook.created = new Date();

  // Style de bordure fine universelle
  const thinBorder = {
    top: { style: 'thin', color: { argb: EXCEL_CONFIG.COLORS.BORDER_GREY } },
    left: { style: 'thin', color: { argb: EXCEL_CONFIG.COLORS.BORDER_GREY } },
    bottom: { style: 'thin', color: { argb: EXCEL_CONFIG.COLORS.BORDER_GREY } },
    right: { style: 'thin', color: { argb: EXCEL_CONFIG.COLORS.BORDER_GREY } }
  };

  // =========================================================================
  // 1. FEUILLE : RAPPORT MED
  // =========================================================================
  const wsMed = workbook.addWorksheet(EXCEL_CONFIG.SHEETS.MED, {
    views: [{ showGridLines: false }]
  });

  // Définition des colonnes
  wsMed.columns = EXCEL_CONFIG.MED_COLUMNS.map(col => ({
    key: col.key,
    width: col.width
  }));

  // Ligne 1 : En-têtes
  const medHeaderRow = wsMed.getRow(1);
  medHeaderRow.height = 25;
  EXCEL_CONFIG.MED_COLUMNS.forEach((col, idx) => {
    const cell = medHeaderRow.getCell(idx + 1);
    cell.value = col.title;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_CONFIG.COLORS.HEADER_BLUE } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_CONFIG.COLORS.TEXT_WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  // Lignes de données dès la ligne 2
  const sortedMedVisites = [...medecinsVisites].sort((a, b) => {
    const dComp = (a.date_visite || '').localeCompare(b.date_visite || '');
    if (dComp !== 0) return dComp;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  sortedMedVisites.forEach((v, index) => {
    const row = wsMed.getRow(index + 2);
    row.height = 20;

    // Format date jj/mm/aaaa
    let displayDate = v.date_visite || '';
    if (displayDate.includes('-')) {
      const [y, m, d] = displayDate.split('-');
      displayDate = `${d}/${m}/${y}`;
    }

    const rowData = [
      displayDate,
      v.nom || '',
      v.specialite || '',
      String(v.telephone || ''),
      v.statut || '',
      v.secteur || '',
      v.pot || '',
      v.email || '',
      v.remplacant || '',
      v.observation || ''
    ];

    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder;
    });
  });

  // =========================================================================
  // 2. FEUILLE : RAPPORT COM (3 niveaux d'en-tête)
  // =========================================================================
  const wsCom = workbook.addWorksheet(EXCEL_CONFIG.SHEETS.COM, {
    views: [{ showGridLines: false }]
  });

  const activeProduits = [...produits]
    .filter(p => p.actif !== false && !p.deleted_at)
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  // Largeurs fixes pour colonnes A, B, C, D
  wsCom.getColumn(1).width = 12; // Date
  wsCom.getColumn(2).width = 35; // Pharmacie
  wsCom.getColumn(3).width = 20; // Secteur
  wsCom.getColumn(4).width = 20; // Grossiste

  // Largeurs dynamiques pour chaque paire de colonnes produit
  let currentProductCol = 5;
  activeProduits.forEach(() => {
    wsCom.getColumn(currentProductCol).width = 8;     // DISPO
    wsCom.getColumn(currentProductCol + 1).width = 7; // ROT/S
    currentProductCol += 2;
  });

  const lastColIdx = 4 + (activeProduits.length * 2);

  // Ligne 1 : Fusion rouge "DISPONIBILITE /Rotation/S"
  if (activeProduits.length > 0) {
    wsCom.mergeCells(1, 5, 1, lastColIdx);
    const titleCell = wsCom.getCell(1, 5);
    titleCell.value = 'DISPONIBILITE /Rotation/S';
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: EXCEL_CONFIG.COLORS.TITLE_RED } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.border = thinBorder;
  }

  // Lignes 2 et 3 : En-têtes fusionnés A, B, C, D
  const fixedHeaders = ['Date', 'Pharmacie', 'Secteur', 'Grossiste'];
  fixedHeaders.forEach((title, idx) => {
    const colIdx = idx + 1;
    wsCom.mergeCells(2, colIdx, 3, colIdx);
    const cell = wsCom.getCell(2, colIdx);
    cell.value = title;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_CONFIG.COLORS.HEADER_GREY } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_CONFIG.COLORS.TEXT_BLACK } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  // Lignes 2 et 3 : Produits AURA
  let pCol = 5;
  activeProduits.forEach((p) => {
    // Ligne 2 : Nom du produit fusionné sur 2 colonnes
    wsCom.mergeCells(2, pCol, 2, pCol + 1);
    const pCell = wsCom.getCell(2, pCol);
    pCell.value = p.nom;

    const hexColor = (p.couleur || '4F81BD').replace('#', '');
    const argbColor = hexColor.length === 6 ? `FF${hexColor.toUpperCase()}` : hexColor;
    const textColor = getContrastTextColor(hexColor);

    pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
    pCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: textColor } };
    pCell.alignment = { vertical: 'middle', horizontal: 'center' };
    pCell.border = thinBorder;

    // Ligne 3 : Sous-en-têtes DISPO et ROT/S
    const dispoCell = wsCom.getCell(3, pCol);
    dispoCell.value = 'DISPO';
    dispoCell.font = { name: 'Calibri', size: 8, bold: true };
    dispoCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dispoCell.border = thinBorder;

    const rotCell = wsCom.getCell(3, pCol + 1);
    rotCell.value = 'ROT/S';
    rotCell.font = { name: 'Calibri', size: 8, bold: true };
    rotCell.alignment = { vertical: 'middle', horizontal: 'center' };
    rotCell.border = thinBorder;

    pCol += 2;
  });

  // Lignes de données dès la ligne 4
  const sortedPharmVisites = [...pharmaciesVisites].sort((a, b) => {
    const dComp = (a.date_visite || '').localeCompare(b.date_visite || '');
    if (dComp !== 0) return dComp;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  sortedPharmVisites.forEach((pv, rowIdx) => {
    const currentLine = rowIdx + 4;
    const row = wsCom.getRow(currentLine);
    row.height = 19;

    let displayDate = pv.date_visite || '';
    if (displayDate.includes('-')) {
      const [y, m, d] = displayDate.split('-');
      displayDate = `${d}/${m}/${y}`;
    }

    // A: Date, B: Pharmacie, C: Secteur, D: Grossiste
    const baseCols = [displayDate, pv.nom || '', pv.secteur || '', pv.grossiste || ''];
    baseCols.forEach((val, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });

    // Colonnes des produits
    let colIndex = 5;
    activeProduits.forEach((prod) => {
      const dispoInfo = pv.disponibilites ? pv.disponibilites[prod.id] : null;

      const dVal = (dispoInfo && dispoInfo.dispo) ? 'd' : 'nd';
      const rotRaw = dispoInfo ? dispoInfo.rot : '';
      const rotVal = (rotRaw !== '' && !isNaN(rotRaw)) ? Number(rotRaw) : (rotRaw || '');

      const cellD = row.getCell(colIndex);
      cellD.value = dVal;
      cellD.font = { name: 'Calibri', size: 9 };
      cellD.alignment = { vertical: 'middle', horizontal: 'center' };
      cellD.border = thinBorder;

      const cellRot = row.getCell(colIndex + 1);
      cellRot.value = rotVal;
      cellRot.font = { name: 'Calibri', size: 9 };
      cellRot.alignment = { vertical: 'middle', horizontal: 'center' };
      cellRot.border = thinBorder;

      colIndex += 2;
    });
  });

  // Ligne TOTAL
  const totalLine = sortedPharmVisites.length + 5;
  const totalCell = wsCom.getCell(totalLine, 2);
  totalCell.value = `TOTAL : ${sortedPharmVisites.length} pharmacies`;
  totalCell.font = { name: 'Calibri', size: 10, bold: true };
  totalCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // =========================================================================
  // 3. FEUILLE : PF (Portefeuille Médecins actifs)
  // =========================================================================
  const wsPf = workbook.addWorksheet(EXCEL_CONFIG.SHEETS.PF, {
    views: [{ showGridLines: false }]
  });

  wsPf.columns = EXCEL_CONFIG.PF_COLUMNS.map(col => ({
    key: col.key,
    width: col.width
  }));

  // En-têtes PF
  const pfHeaderRow = wsPf.getRow(1);
  pfHeaderRow.height = 25;
  EXCEL_CONFIG.PF_COLUMNS.forEach((col, idx) => {
    const cell = pfHeaderRow.getCell(idx + 1);
    cell.value = col.title;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_CONFIG.COLORS.HEADER_BLUE } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_CONFIG.COLORS.TEXT_WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  // Tri alphabétique sur le nom
  const sortedPf = [...portefeuilleMedecins]
    .filter(m => !m.deleted_at && m.actif !== false)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }));

  sortedPf.forEach((m, idx) => {
    const row = wsPf.getRow(idx + 2);
    row.height = 20;

    const rowData = [
      idx + 1,
      m.nom || '',
      m.specialite || '',
      String(m.telephone || ''),
      m.statut || '',
      m.secteur || '',
      m.pot || '',
      m.email || '',
      m.remplacant || ''
    ];

    rowData.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });
  });

  // =========================================================================
  // 4. NOM DU FICHIER ET SORTIE BLOB
  // =========================================================================
  const cleanNom = String(delegueNom || 'DELEGUE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');

  let filename = '';
  if (dateDebut && dateFin && dateDebut !== dateFin) {
    filename = `RAPPORT_AURA_${cleanNom}_${dateDebut}_au_${dateFin}.xlsx`;
  } else {
    filename = `RAPPORT_AURA_${cleanNom}_${dateDebut || 'JOUR'}.xlsx`;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  return { blob, filename };
}
