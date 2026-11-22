/** The four service playbooks in the MVP (README "Initial customer and scope"). */
export const SERVICES = {
  "new-website": "New website development",
  redesign: "Website redesign",
  ecommerce: "E-commerce development",
  maintenance: "Maintenance and performance",
} as const;

export type ServiceCode = keyof typeof SERVICES;

export const SERVICE_CODES = Object.keys(SERVICES) as ServiceCode[];

export function serviceLabel(code: string): string {
  return SERVICES[code as ServiceCode] ?? "Service not decided";
}
