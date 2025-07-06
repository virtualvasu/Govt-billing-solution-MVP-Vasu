import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonToggle,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  saveOutline,
  cloudUpload,
  save,
  print,
  mail,
  settings,
  informationCircle,
  moon,
  sunny,
  card,
  alertCircle,
} from "ionicons/icons";
import Menu from "../components/Menu/Menu";
import { Local } from "../components/Storage/LocalStorage";
import { useTheme } from "../contexts/ThemeContext";
import { useInvoice } from "../contexts/InvoiceContext";
import "./SettingsPage.css";

const SettingsPage: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { billType, updateBillType } = useInvoice();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleSaveLocal = () => {
    setShowMenu(true);
  };

  return (
    <IonPage
      className={isDarkMode ? "settings-page-dark" : "settings-page-light"}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontWeight: "bold", fontSize: "1.3em" }}>
            ⚙️ User Settings
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={toggleDarkMode}
              style={{ fontSize: "1.5em" }}
            >
              <IonIcon icon={isDarkMode ? sunny : moon} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent
        fullscreen
        className={
          isDarkMode ? "settings-content-dark" : "settings-content-light"
        }
      >
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Menu & Settings</IonTitle>
            <IonButtons slot="end">
              <IonButton
                fill="clear"
                onClick={toggleDarkMode}
                style={{ fontSize: "1.5em" }}
              >
                <IonIcon icon={isDarkMode ? sunny : moon} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <div
          className={`menu-page-container ${isDarkMode ? "" : "light-mode"}`}
        >
          {/* Settings Card */}
          <IonCard
            className={
              isDarkMode ? "settings-card-dark" : "settings-card-light"
            }
          >
            <IonCardHeader
              className={
                isDarkMode
                  ? "settings-card-header-dark"
                  : "settings-card-header-light"
              }
            >
              <IonCardTitle
                className={
                  isDarkMode
                    ? "settings-card-title-dark"
                    : "settings-card-title-light"
                }
              >
                <IonIcon
                  icon={settings}
                  style={{ marginRight: "8px", fontSize: "1.5em" }}
                />
                Preferences
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonIcon icon={isDarkMode ? moon : sunny} slot="start" />
                  <IonLabel>Dark Mode</IonLabel>
                  <IonToggle
                    checked={isDarkMode}
                    onIonChange={(e) => toggleDarkMode()}
                    slot="end"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel>Bill Type</IonLabel>
                  <IonSelect
                    value={billType}
                    onIonChange={(e) => updateBillType(e.detail.value)}
                    slot="end"
                  >
                    <IonSelectOption value={1}>Invoice</IonSelectOption>
                    <IonSelectOption value={2}>Receipt</IonSelectOption>
                    <IonSelectOption value={3}>Estimate</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Menu Component (Action Sheet) */}
        <Menu showM={showMenu} setM={() => setShowMenu(false)} />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
