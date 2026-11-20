import { jsPDF } from "jspdf";
import type { TrainingPlan, UserProfile } from "../types";

/**
 * Gera e baixa o PDF da planilha semanal (extraído do App.tsx, issue #8).
 * Não checa acesso: quem chama decide se o atleta pode exportar (paywall).
 */
export function exportPlanPdf(plan: TrainingPlan, profile: UserProfile): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const athleteName = profile.name || "Atleta";
  const levelStr = profile.level ? profile.level.charAt(0).toUpperCase() + profile.level.slice(1) : "Não especificado";
  const ftpStr = profile.ftp ? `${profile.ftp} W` : "Não configurado";
  const weekNum = plan.weekNumber || 1;

  // --- Elegant Color Scheme ---
  const primaryColor = [15, 23, 42]; // Slate-900 / Deep charcoal
  const secondaryColor = [101, 163, 13]; // Lime-600
  const accentColor = [225, 29, 72]; // Rose-600 (Health accent)
  const textColor = [51, 65, 85]; // Slate-700
  const lightBg = [248, 250, 252]; // Slate-50
  const borderSlate = [226, 232, 240]; // Slate-200

  // Simple helpers for layout
  let y = 15;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 280) {
      doc.addPage();
      y = 15;
      drawFooter();
    }
  };

  const drawHeader = () => {
    // Top bar design
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BIKER AI - SEU TREINADOR DE CICLISMO INTELIGENTE", margin, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(190, 242, 100); // Light lime text
    doc.text("PLANILHA DE TREINAMENTO INDIVIDUALIZADA & SEGURA", margin, 18);

    y = 35;
  };

  const drawFooter = () => {
    const pageCount = doc.internal.pages.length - 1;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Lembre-se sempre: sua saúde é o mais importante!", margin, 287);
    doc.text(`Página ${pageCount}`, pageWidth - margin - 15, 287);
  };

  // Draw initial header
  drawHeader();

  // 1. Athlete Information Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`ATLETA: ${athleteName.toUpperCase()}`, margin + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`Nível: ${levelStr}`, margin + 5, y + 13);
  doc.text(`FTP Estimado: ${ftpStr}`, margin + 5, y + 19);

  doc.setFont("helvetica", "bold");
  doc.text(`PLANILHA: SEMANA ${weekNum}`, margin + 110, y + 6);
  doc.setFont("helvetica", "normal");
  const todayStr = new Date().toLocaleDateString("pt-BR");
  doc.text(`Data de Exportação: ${todayStr}`, margin + 110, y + 13);
  doc.text(`Status: Saúde em Primeiro Lugar`, margin + 110, y + 19);

  y += 32;

  // 2. Health & Safety Banner
  doc.setFillColor(255, 241, 242); // Rose-50 light background
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SAÚDE EM PRIMEIRO LUGAR", margin + 5, y + 6);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const safetyMsg = "Lembre-se: a sua saúde é o mais importante! Caso sinta dores fora do comum, tonturas ou cansaço excessivo, interrompa o esforço imediatamente para se preservar.";
  const splitSafety = doc.splitTextToSize(safetyMsg, contentWidth - 10);
  doc.text(splitSafety, margin + 5, y + 11);

  y += 24;

  // 3. General Coach Messages / Observations (if exists)
  if (plan.coachMessage || plan.observations || plan.summary) {
    checkPageBreak(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Mensagem do Treinador", margin, y);
    y += 5;

    // Draw a line
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 25, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    const message = plan.coachMessage || plan.observations || plan.summary || "Bons treinos para esta semana! Mantenha a constância e respeite as zonas de intensidade.";
    const splitMsg = doc.splitTextToSize(message, contentWidth);
    doc.text(splitMsg, margin, y);
    y += (splitMsg.length * 4) + 6;
  }

  // 4. Workout Sessions List
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Programação de Atividades", margin, y);
  y += 5;

  // Draw secondary line
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 25, y);
  y += 7;

  const listWorkouts = plan.workouts || [];

  listWorkouts.forEach((workout) => {
    // Calculate height needed for this workout record
    const descLines = doc.splitTextToSize(`Estrutura: ${workout.structure || workout.goal || ""}`, contentWidth - 20);
    const tipLines = workout.tip ? doc.splitTextToSize(`Dica: ${workout.tip}`, contentWidth - 20) : [];
    const recordHeight = 22 + (descLines.length * 4) + (tipLines.length > 0 ? (tipLines.length * 4) + 2 : 0) + 4;

    checkPageBreak(recordHeight);

    // Card Container for Workout
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
    doc.roundedRect(margin, y, contentWidth, recordHeight - 4, 2, 2, "FD");

    // Set vertical pointer for inside the card content
    let insideY = y + 6;

    // Header of card (e.g. Segunda-Feira | Treino Regenerativo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${workout.day.toUpperCase()} | ${workout.type}`, margin + 5, insideY);

    // Duration badge / Zone Badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Duração: ${workout.duration} min`, margin + 110, insideY);
    doc.text(`Zona Alvo: ${workout.targetZone || "Livre"}`, margin + 145, insideY);

    insideY += 6;

    // Draw a thin separator inside card
    doc.setDrawColor(241, 245, 249);
    doc.line(margin + 4, insideY, margin + contentWidth - 4, insideY);
    insideY += 5;

    // Goal & Structure Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Objetivo:", margin + 5, insideY);
    doc.setFont("helvetica", "normal");
    doc.text(workout.goal || "Desenvolvimento de fôlego e técnica.", margin + 18, insideY);
    insideY += 5;

    // Structure
    doc.setFont("helvetica", "bold");
    doc.text("Estrutura:", margin + 5, insideY);
    doc.setFont("helvetica", "normal");
    doc.text(descLines, margin + 18, insideY);
    insideY += (descLines.length * 4) + 1;

    // Extra Coach TIP if exists
    if (workout.tip) {
      insideY += 2;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(tipLines, margin + 5, insideY);
      insideY += (tipLines.length * 4);
    }

    // Check if Completed to display a cute checked badge
    if (workout.completed) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("[ CONCLUÍDO ]", margin + 148, y + 11);
    }

    y += recordHeight;
  });

  // Draw footers on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  doc.save(`Planilha_Ciclismo_Semana_${weekNum}_${athleteName.replace(/\s+/g, "_")}.pdf`);
}
