export type TemplateVariables = Record<
  string,
  string | number | null | undefined
>;

export function renderMessageTemplate(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key: string) => {
      const value =
        variables[key];

      return value === null ||
        value === undefined
        ? ""
        : String(value);
    }
  );
}

export function normalizeWhatsAppPhone(
  value: string
): string {
  let phone =
    value.replace(/\D/g, "");

  if (
    phone.startsWith("0") &&
    phone.length === 11
  ) {
    phone =
      `90${phone.slice(1)}`;
  }

  if (
    phone.length === 10
  ) {
    phone = `90${phone}`;
  }

  return phone;
}

export function createWhatsAppUrl(
  phone: string,
  message: string
): string {
  return (
    `https://wa.me/${normalizeWhatsAppPhone(
      phone
    )}?text=${encodeURIComponent(
      message
    )}`
  );
}
