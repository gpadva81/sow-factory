#!/usr/bin/env node
/**
 * Generates a sample SOW template DOCX with all required placeholders.
 * Run: node scripts/gen-sample-template.js
 * Output: docs/sample-sow-template.docx
 *
 * Requires: npm install (docxtemplater + pizzip are project deps)
 *
 * The output file should be uploaded to SharePoint and its driveItem ID
 * used when creating a template in the admin UI.
 */

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

// Minimal OOXML document – a complete valid .docx structure
// We build it from scratch using known-good XML to avoid binary blobs in source.

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;

function p(text, style) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function buildDocumentXml() {
  const rows = [
    p('STATEMENT OF WORK', 'Heading1'),
    p(''),
    p('{project_title}', 'Heading1'),
    p(''),
    p('Client: {client_name}'),
    p(''),

    p('1. Overview', 'Heading2'),
    p('{overview}'),
    p(''),

    p('2. Objectives', 'Heading2'),
    // Loop over objectives array
    '{#objectives}' + p('{text}') + '{/objectives}',
    p(''),

    p('3. Scope', 'Heading2'),
    p('Included:', 'Heading2'),
    '{#scope_included}' + p('{text}') + '{/scope_included}',
    p('Excluded:', 'Heading2'),
    '{#scope_excluded}' + p('{text}') + '{/scope_excluded}',
    p(''),

    p('4. Deliverables', 'Heading2'),
    '{#deliverables}' +
      p('{name}', 'Heading2') +
      p('{description}') +
      p('Acceptance Criteria: {acceptance_criteria}') +
    '{/deliverables}',
    p(''),

    p('5. Timeline', 'Heading2'),
    '{#timeline}' + p('{milestone}: {eta}') + '{/timeline}',
    p(''),

    p('6. Roles & Responsibilities', 'Heading2'),
    '{#roles_responsibilities}' +
      p('{role}', 'Heading2') +
      '{#responsibilities}' + p('{text}') + '{/responsibilities}' +
    '{/roles_responsibilities}',
    p(''),

    p('7. Assumptions', 'Heading2'),
    '{#assumptions}' + p('{text}') + '{/assumptions}',
    p(''),

    p('8. Risks', 'Heading2'),
    '{#risks}' + p('{risk}: {mitigation}') + '{/risks}',
    p(''),

    p('9. Pricing', 'Heading2'),
    p('Model: {pricing_model}'),
    p('Amount: {pricing_currency} {pricing_amount}'),
    p('Notes: {pricing_notes}'),
    p(''),

    p('10. Terms & Conditions', 'Heading2'),
    '{#terms}' + p('{text}') + '{/terms}',
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:mv="urn:schemas-microsoft-com:mac:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
            xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
            xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
            mc:Ignorable="w14 wp14">
  <w:body>
    ${rows.join('\n    ')}
  </w:body>
</w:document>`;
}

// Build the zip
const zip = new PizZip();
zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
zip.file('_rels/.rels', RELS_XML);
zip.file('word/document.xml', buildDocumentXml());
zip.file('word/styles.xml', STYLES_XML);
zip.file('word/_rels/document.xml.rels', WORD_RELS_XML);

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
const outPath = path.join(__dirname, '..', 'docs', 'sample-sow-template.docx');
fs.writeFileSync(outPath, buf);
console.log(`✓ Sample template written to ${outPath}`);
console.log('  Upload this to SharePoint and note the driveItem ID.');
