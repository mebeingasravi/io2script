/**
 * Zero-dependency, allocation-conscious CSV line parser.
 * Handles RFC 4180 quoted fields (commas and escaped `""` inside quotes),
 * which is required because the sample data embeds commas inside a quoted
 * `Date Time` field. Operates on a single line at a time to stay compatible
 * with a line-by-line stream reader.
 *
 * @param {string} line - A single CSV line, without the trailing newline.
 * @param {string} [delimiter=','] - Field delimiter.
 * @returns {string[]} Parsed field values in column order.
 */
export function parseCsvLine(line, delimiter = ',') {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
}

/**
 * Maps parsed CSV field values to a header row, producing a plain object.
 *
 * @param {string[]} headers - Column names in order.
 * @param {string[]} values - Field values in the same order as `headers`.
 * @returns {Record<string, string>} Row object keyed by header name.
 */
export function mapRowToObject(headers, values) {
  const row = {};
  for (let i = 0; i < headers.length; i += 1) {
    row[headers[i]] = values[i] !== undefined ? values[i] : '';
  }
  return row;
}
