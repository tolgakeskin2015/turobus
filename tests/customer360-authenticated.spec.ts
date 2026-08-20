import {
  expect,
  test,
} from "@playwright/test";


const email =
  process.env
    .CUSTOMER360_E2E_EMAIL;

const password =
  process.env
    .CUSTOMER360_E2E_PASSWORD;


test.describe(
  "Customer 360 authenticated critical routes",
  () => {

    test.skip(
      !email ||
      !password,
      "Gerçek Customer 360 E2E kullanıcı bilgileri tanımlı değil."
    );


    test(
      "login and open critical Customer 360 centers",
      async ({
        page,
      }) => {

        await page.goto(
          "/giris"
        );


        await page
          .locator(
            'input[type="email"]'
          )
          .fill(
            email!
          );


        await page
          .locator(
            'input[type="password"]'
          )
          .fill(
            password!
          );


        await page
          .getByRole(
            "button",
            {
              name:
                "Giriş Yap",
            }
          )
          .click();


        await page.waitForURL(
          /\/dashboard\/hesabim/,
          {
            timeout:
              30_000,
          }
        );


        const routes = [
          "/dashboard/musteri-360",
          "/dashboard/musteri-360/eslestirme",
          "/dashboard/musteri-360/otomatik-profiller",
          "/dashboard/musteri-360/canli-senkronizasyon",
          "/dashboard/musteri-360/birlestirme",
          "/dashboard/musteri-360/gizlilik-guvenlik",
          "/dashboard/musteri-360/provider-saglik",
        ];


        for (
          const route of
          routes
        ) {
          await page.goto(
            route
          );


          await expect(
            page.locator(
              "body"
            )
          ).not.toContainText(
            "Application error"
          );


          await expect(
            page.locator(
              "body"
            )
          ).not.toContainText(
            "Internal Server Error"
          );
        }


        await page.goto(
          "/dashboard/musteri-360"
        );


        await expect(
          page.getByText(
            "Yeni Müşteri"
          ).first()
        ).toBeVisible();


        await expect(
          page.getByText(
            "Provider Sağlığı"
          ).first()
        ).toBeVisible();


        await expect(
          page.getByText(
            "KVKK & Güvenlik"
          ).first()
        ).toBeVisible();


        await expect(
          page.getByText(
            "Müşteri Birleştirme"
          ).first()
        ).toBeVisible();
      }
    );
  }
);
