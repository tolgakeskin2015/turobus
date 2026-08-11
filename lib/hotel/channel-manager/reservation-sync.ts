export type ReservationChannelImpact = {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
};

export async function notifyReservationChannelSync(
  companyId: string,
  impacts: ReservationChannelImpact[]
) {
  try {
    const response = await fetch(
      "/api/channel-manager/reservation-sync",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          impacts,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Reservation channel sync başarısız:",
        await response.text()
      );
    }
  } catch (error) {
    console.error(
      "Reservation channel sync hatası:",
      error
    );
  }
}


export function normalizeExternalReservationCode(
  value: unknown
): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();
}

export function normalizeGuestEmail(
  value: unknown
): string | null {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();

  return email.includes("@")
    ? email
    : null;
}

export function normalizeGuestPhone(
  value: unknown
): string | null {
  const phone = String(value ?? "")
    .replace(/[^0-9+]/g, "")
    .trim();

  return phone.length >= 7
    ? phone
    : null;
}
