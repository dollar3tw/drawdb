import { SideSheet as SemiUISideSheet } from "@douyinfe/semi-ui";
import { SIDESHEET } from "../../../data/constants";
import { useSettings } from "../../../hooks";
import timeLine from "../../../assets/process.png";
import timeLineDark from "../../../assets/process_dark.png";
import RevisionHistory from "./Timeline";
import { useTranslation } from "react-i18next";

export default function Sidesheet({ type, onClose, diagramId }) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  function getTitle(type) {
    switch (type) {
      case SIDESHEET.TIMELINE:
        return (
          <div className="flex items-center">
            <img
              src={settings.mode === "light" ? timeLine : timeLineDark}
              className="w-7"
              alt="revision history icon"
            />
            <div className="ms-3 text-lg">{t("revision_history")}</div>
          </div>
        );
      default:
        break;
    }
  }

  function getContent(type) {
    switch (type) {
      case SIDESHEET.TIMELINE:
        return <RevisionHistory diagramId={diagramId} />;
      default:
        break;
    }
  }

  return (
    <SemiUISideSheet
      visible={type !== SIDESHEET.NONE}
      onCancel={onClose}
      width={340}
      title={getTitle(type)}
      style={{ paddingBottom: "16px" }}
      bodyStyle={{ padding: "0px" }}
    >
      {getContent(type)}
    </SemiUISideSheet>
  );
}
