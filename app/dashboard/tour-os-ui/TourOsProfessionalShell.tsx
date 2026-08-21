"use client";

import Link from "next/link";

import {
  ReactNode,
  useMemo,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  FaBell,
  FaBus,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaFileAlt,
  FaMapMarkedAlt,
  FaMobileAlt,
  FaMoneyBillWave,
  FaPaperPlane,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
} from "react-icons/fa";


type Props = {
  children:
    ReactNode;
};


type NavItem = {
  label:
    string;
  href:
    string;
  icon:
    ReactNode;
  match?:
    string[];
};


const NAV:
  NavItem[] = [

  {
    label:
      "Kontrol Kulesi",
    href:
      "/dashboard/turlar/control-tower",
    icon:
      <FaMapMarkedAlt />,
  },

  {
    label:
      "Tüm Turlar",
    href:
      "/dashboard/turlar",
    icon:
      <FaBus />,
  },

  {
    label:
      "Hazırlık",
    href:
      "/dashboard/tur-os/hazirlik",
    icon:
      <FaCheckCircle />,
    match: [
      "/hazirlik",
    ],
  },

  {
    label:
      "Durum & Akış",
    href:
      "/dashboard/tur-os/durum",
    icon:
      <FaRoute />,
    match: [
      "/durum",
    ],
  },

  {
    label:
      "Yolcu",
    href:
      "/dashboard/tur-os/yolcular",
    icon:
      <FaUsers />,
    match: [
      "/yolcular",
    ],
  },

  {
    label:
      "Uçuş",
    href:
      "/dashboard/tur-os/ucus",
    icon:
      <FaPlane />,
    match: [
      "/ucus",
    ],
  },

  {
    label:
      "Otobüs",
    href:
      "/dashboard/tur-os/otobus",
    icon:
      <FaBus />,
    match: [
      "/otobus",
    ],
  },

  {
    label:
      "Görevler",
    href:
      "/dashboard/tur-os/gorevler",
    icon:
      <FaTasks />,
    match: [
      "/gorevler",
    ],
  },

  {
    label:
      "Belgeler",
    href:
      "/dashboard/tur-os/belgeler",
    icon:
      <FaFileAlt />,
    match: [
      "/belgeler",
    ],
  },

  {
    label:
      "Mesajlar",
    href:
      "/dashboard/tur-os/mesajlar",
    icon:
      <FaPaperPlane />,
    match: [
      "/mesajlar",
    ],
  },

  {
    label:
      "Finans",
    href:
      "/dashboard/tur-os/finans",
    icon:
      <FaMoneyBillWave />,
    match: [
      "/finans",
    ],
  },

  {
    label:
      "Mobil",
    href:
      "/dashboard/tur-os/mobil",
    icon:
      <FaMobileAlt />,
    match: [
      "/mobil",
    ],
  },

];


export default function TourOsProfessionalShell({
  children,
}: Props) {

  const pathname =
    usePathname();


  const activeLabel =
    useMemo(
      () => {

        const direct =
          NAV.find(
            item =>
              item.href ===
              pathname
          );


        if (
          direct
        ) {
          return direct.label;
        }


        const nested =
          NAV.find(
            item =>
              item.match?.some(
                match =>
                  pathname.includes(
                    match
                  )
              )
          );


        return (
          nested?.label ||
          "Tur Operasyon"
        );

      },
      [
        pathname,
      ]
    );


  return (
    <div className="tour-os-scope">

      <div className="tour-os-ambient tour-os-ambient-one" />
      <div className="tour-os-ambient tour-os-ambient-two" />


      <header className="tour-os-command-bar">

        <div className="tour-os-command-inner">

          <div className="tour-os-command-brand">

            <div className="tour-os-command-icon">
              <FaMapMarkedAlt />
            </div>


            <div>

              <div className="tour-os-command-eyebrow">
                TUROBUS
              </div>


              <div className="tour-os-command-title">
                Tour Operations OS
              </div>

            </div>

          </div>


          <div className="tour-os-command-context">

            <span className="tour-os-live-dot" />

            <span>
              {activeLabel}
            </span>

          </div>


          <div className="tour-os-command-actions">

            <Link
              href="/dashboard/turlar/control-tower"
              className="tour-os-command-action"
            >
              <FaChartLine />

              <span>
                Control Tower
              </span>
            </Link>


            <Link
              href="/dashboard/operasyon"
              className="tour-os-command-action"
            >
              <FaClipboardList />

              <span>
                Operasyon
              </span>
            </Link>


            <Link
              href="/dashboard/turlar/control-tower"
              className="tour-os-command-alert"
              aria-label="Operasyon alarmları"
            >
              <FaBell />
            </Link>

          </div>

        </div>


        <nav className="tour-os-module-nav">

          <div className="tour-os-module-track">

            {NAV.map(
              item => {

                const active =
                  item.href ===
                    pathname ||
                  item.match?.some(
                    match =>
                      pathname.includes(
                        match
                      )
                  );


                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className={
                      active
                        ? "tour-os-module-link tour-os-module-link-active"
                        : "tour-os-module-link"
                    }
                  >

                    <span className="tour-os-module-icon">
                      {item.icon}
                    </span>


                    <span>
                      {item.label}
                    </span>

                  </Link>
                );

              }
            )}

          </div>

        </nav>

      </header>


      <div className="tour-os-page-stage">

        {children}

      </div>

    </div>
  );

}
