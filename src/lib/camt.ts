import * as XLSX from "xlsx";

export type TxStatus = "clear" | "ambiguous" | "error";

export interface Transaction {
  id: number;
  date: string; // ISO yyyy-mm-dd or ""
  valueDate: string;
  amount: number; // signed (debit < 0)
  currency: string;
  direction: "CRDT" | "DBIT";
  counterparty: string;
  iban: string;
  reference: string;
  remittance: string;
  status: TxStatus;
  reasons: string[];
}

export interface ParsedStatement {
  fileName: string;
  fileSize: number;
  accountIban: string;
  statementId: string;
  transactions: Transaction[];
  doc: Document;
  entries: Element[];
}

const GENERIC = /^(vir(ement)?|paiement|payment|transfer|sepa|virement sepa|sct|divers|autre|n\/?a|-+)$/i;

function byName(root: Element | Document, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", name));
}
function first(root: Element | Document | null | undefined, ...path: string[]): Element | null {
  let cur: (Element | Document)[] = root ? [root] : [];
  for (const p of path) {
    const next: Element[] = [];
    for (const c of cur) next.push(...byName(c, p));
    cur = next;
    if (!cur.length) return null;
  }
  return (cur[0] as Element) ?? null;
}
const text = (el: Element | null) => (el?.textContent ?? "").trim();
const toIsoDate = (s: string) => (s ? s.slice(0, 10) : "");

export function parseCamt(xml: string, fileName: string, fileSize: number): ParsedStatement {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("Le fichier n'est pas un XML valide.");
  }
  const root = doc.documentElement;
  const ns = root.namespaceURI ?? "";
  if (!/camt\.053/i.test(ns) && !byName(doc, "BkToCstmrStmt").length) {
    throw new Error("Ce fichier n'est pas un relevé camt.053 (BkToCstmrStmt introuvable).");
  }
  const entries = byName(doc, "Ntry");
  if (!entries.length) throw new Error("Aucune écriture (Ntry) trouvée dans ce relevé.");

  const transactions: Transaction[] = entries.map((e, i) => {
    const amtEl = first(e, "Amt");
    const rawAmt = text(amtEl).replace(",", ".");
    const parsedAmt = parseFloat(rawAmt);
    const currency = amtEl?.getAttribute("Ccy") ?? "EUR";
    const direction = text(first(e, "CdtDbtInd")) === "DBIT" ? "DBIT" : "CRDT";
    const bookg = first(e, "BookgDt");
    const date = toIsoDate(text(first(bookg, "Dt")) || text(first(bookg, "DtTm")));
    const val = first(e, "ValDt");
    const valueDate = toIsoDate(text(first(val, "Dt")) || text(first(val, "DtTm")));

    const details = byName(e, "TxDtls");
    const d0 = details[0] ?? e;
    const party = direction === "CRDT" ? "Dbtr" : "Cdtr";
    const counterparty = text(first(d0, "RltdPties", party, "Nm")) || text(first(d0, "RltdPties", party, "Pty", "Nm"));
    const iban = text(first(d0, "RltdPties", party + "Acct", "IBAN")) || text(first(d0, "RltdPties", party + "Acct", "Id", "IBAN"));
    const e2e = text(first(d0, "EndToEndId"));
    const strd = text(first(d0, "Strd", "CdtrRefInf", "Ref"));
    const reference = strd || (/^not\s?provided$/i.test(e2e) ? "" : e2e);
    const remittance = byName(d0, "Ustrd").map(text).filter(Boolean).join(" ") || text(first(e, "AddtlNtryInf"));

    const reasons: string[] = [];
    let status: TxStatus = "clear";

    if (!isFinite(parsedAmt) || parsedAmt === 0) reasons.push("Montant illisible ou nul");
    if (!date || isNaN(Date.parse(date))) reasons.push("Date de comptabilisation invalide");
    if (reasons.length) {
      status = "error";
    } else {
      if (!counterparty) reasons.push("Donneur d'ordre absent");
      if (!remittance) reasons.push("Aucun libellé de paiement");
      else if (GENERIC.test(remittance.trim()) || remittance.trim().length < 5) reasons.push("Libellé trop générique");
      if (!reference && !/\b(loyer|lot|appt|apt|bail|charges?|ref)\b/i.test(remittance) && !/\d{3,}/.test(remittance))
        reasons.push("Aucune référence locataire/lot");
      if (details.length > 1) reasons.push(`Écriture groupée (${details.length} détails)`);
      if (reasons.length) status = "ambiguous";
    }

    return {
      id: i + 1,
      date,
      valueDate,
      amount: isFinite(parsedAmt) ? (direction === "DBIT" ? -parsedAmt : parsedAmt) : 0,
      currency,
      direction,
      counterparty,
      iban,
      reference,
      remittance,
      status,
      reasons,
    };
  });

  return {
    fileName,
    fileSize,
    accountIban: text(first(doc, "Stmt", "Acct", "Id", "IBAN")),
    statementId: text(first(doc, "Stmt", "Id")),
    transactions,
    doc,
    entries,
  };
}

export function buildFilteredXml(p: ParsedStatement, includeAmbiguous = false): string {
  const clone = p.doc.cloneNode(true) as Document;
  const entries = byName(clone, "Ntry");
  entries.forEach((el, i) => {
    const st = p.transactions[i]?.status;
    if (st !== "clear" && !(includeAmbiguous && st === "ambiguous")) el.parentNode?.removeChild(el);
  });
  let out = new XMLSerializer().serializeToString(clone);
  if (!out.startsWith("<?xml")) out = '<?xml version="1.0" encoding="UTF-8"?>\n' + out;
  return out;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadFilteredXml(p: ParsedStatement, includeAmbiguous = false) {
  const base = p.fileName.replace(/\.(xml|camt)$/i, "");
  downloadBlob(new Blob([buildFilteredXml(p, includeAmbiguous)], { type: "application/xml" }), `${base}_filtre.xml`);
}

export function exportAmbiguousExcel(p: ParsedStatement, includeErrors = true) {
  const rows = p.transactions
    .filter((t) => t.status === "ambiguous" || (includeErrors && t.status === "error"))
    .map((t) => ({
      "N°": t.id,
      Date: t.date,
      "Date valeur": t.valueDate,
      Sens: t.direction === "CRDT" ? "Crédit" : "Débit",
      Montant: t.amount,
      Devise: t.currency,
      "Donneur d'ordre": t.counterparty,
      IBAN: t.iban,
      Référence: t.reference,
      Libellé: t.remittance,
      Statut: t.status === "error" ? "Erreur" : "Ambigu",
      Motifs: t.reasons.join(" ; "),
      "Locataire / lot (à compléter)": "",
    }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [6, 12, 12, 8, 12, 8, 28, 30, 22, 40, 10, 44, 28].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ambigus");
  const base = p.fileName.replace(/\.(xml|camt)$/i, "");
  XLSX.writeFile(wb, `${base}_ambigus.xlsx`);
  return rows.length;
}

export const fmtEUR = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur }).format(n);

export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export function sampleCamt(): string {
  const entry = (o: {
    amt: string; cd?: "CRDT" | "DBIT"; date: string; name?: string; iban?: string; e2e?: string; ustrd?: string; multi?: boolean;
  }) => `
      <Ntry>
        <Amt Ccy="EUR">${o.amt}</Amt>
        <CdtDbtInd>${o.cd ?? "CRDT"}</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>${o.date}</Dt></BookgDt>
        <ValDt><Dt>${o.date}</Dt></ValDt>
        <NtryDtls>
          <TxDtls>
            ${o.e2e ? `<Refs><EndToEndId>${o.e2e}</EndToEndId></Refs>` : ""}
            <RltdPties>
              ${o.name ? `<${(o.cd ?? "CRDT") === "CRDT" ? "Dbtr" : "Cdtr"}><Nm>${o.name}</Nm></${(o.cd ?? "CRDT") === "CRDT" ? "Dbtr" : "Cdtr"}>` : ""}
              ${o.iban ? `<${(o.cd ?? "CRDT") === "CRDT" ? "DbtrAcct" : "CdtrAcct"}><Id><IBAN>${o.iban}</IBAN></Id></${(o.cd ?? "CRDT") === "CRDT" ? "DbtrAcct" : "CdtrAcct"}>` : ""}
            </RltdPties>
            ${o.ustrd ? `<RmtInf><Ustrd>${o.ustrd}</Ustrd></RmtInf>` : ""}
          </TxDtls>
          ${o.multi ? `<TxDtls><RmtInf><Ustrd>Lot 12</Ustrd></RmtInf></TxDtls>` : ""}
        </NtryDtls>
      </Ntry>`;
  const list = [
    { amt: "850.00", date: "2025-03-03", name: "Martin Dupont", iban: "FR7630004000031234567890143", e2e: "LOY-0303-A12", ustrd: "Loyer mars 2025 appt A12" },
    { amt: "720.00", date: "2025-03-03", name: "Sophie Lambert", iban: "FR7610107001011234567890129", e2e: "LOY-0303-B04", ustrd: "Loyer mars 2025 lot B04" },
    { amt: "1120.50", date: "2025-03-04", name: "SCI Les Tilleuls", iban: "FR7630002005500000157845Z02", ustrd: "Loyer + charges T1 bail 2291" },
    { amt: "640.00", date: "2025-03-04", iban: "FR7614508000308500064780016", ustrd: "Virement" },
    { amt: "950.00", date: "2025-03-05", name: "Karim Benali", iban: "FR7617569000301234567890188", e2e: "LOY-0305-C08", ustrd: "Loyer mars C08" },
    { amt: "1480.00", date: "2025-03-05", name: "Famille Rousseau", iban: "FR7630004000031234567890155", ustrd: "Paiement", multi: true },
    { amt: "560.00", date: "2025-03-06", name: "Julie Moreau", iban: "FR7610107001011234567890177", e2e: "LOY-0306-D02", ustrd: "Loyer mars 2025 lot D02" },
    { amt: "89.90", cd: "DBIT" as const, date: "2025-03-06", name: "EDF Collectivités", ustrd: "Facture électricité parties communes 2025-02" },
    { amt: "780.00", date: "2025-03-07", ustrd: "" },
    { amt: "-", date: "2025-03-07", name: "Inconnu", ustrd: "Test montant invalide" },
    { amt: "690.00", date: "2025-03-08", name: "Thomas Girard", iban: "FR7630004000031234567890199", e2e: "LOY-0308-E11", ustrd: "Loyer mars 2025 appt E11" },
    { amt: "1010.00", date: "2025-03-10", name: "Nadia Haddad", iban: "FR7612548029981234567890161", e2e: "LOY-0310-F03", ustrd: "Loyer mars 2025 lot F03" },
    { amt: "430.00", date: "2025-03-11", name: "Paul Fontaine", ustrd: "Participation charges lot 7" },
    { amt: "890.00", date: "2025-03-12", name: "Claire Petit", iban: "FR7630004000031234567890222", e2e: "LOY-0312-G09", ustrd: "Loyer mars 2025 appt G09" },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>STMF-DEMO-2025-03</MsgId><CreDtTm>2025-03-14T08:00:00</CreDtTm></GrpHdr>
    <Stmt>
      <Id>STMT-2025-03-001</Id>
      <Acct><Id><IBAN>FR7612345678901234567890123</IBAN></Id><Ccy>EUR</Ccy></Acct>${list.map(entry).join("")}
    </Stmt>
  </BkToCstmrStmt>
</Document>`;
}
