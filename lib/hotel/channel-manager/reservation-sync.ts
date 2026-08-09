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
