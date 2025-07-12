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
  IonInput,
  IonModal,
  IonToast,
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
  logIn,
  personAdd,
  logOut,
  checkmarkCircle,
  personCircle,
} from "ionicons/icons";
import Menu from "../components/Menu/Menu";
import { Local } from "../components/Storage/LocalStorage";
import { useTheme } from "../contexts/ThemeContext";
import { useInvoice } from "../contexts/InvoiceContext";
import "./SettingsPage.css";
import {
  cloudService,
  ServerFile,
  LoginCredentials,
  RegisterCredentials,
} from "../services/cloud-service";

const SettingsPage: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { billType, updateBillType } = useInvoice();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auth state
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [registerCredentials, setRegisterCredentials] =
    useState<RegisterCredentials>({
      name: "",
      email: "",
      password: "",
    });

  const handleSaveLocal = () => {
    setShowMenu(true);
  };

  const handleLogin = async () => {
    if (!loginCredentials.email || !loginCredentials.password) {
      setToastMessage("Please fill in all fields");
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      await cloudService.login(loginCredentials);
      setShowLoginModal(false);
      setLoginCredentials({ email: "", password: "" });
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials."
      );
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (
      !registerCredentials.name ||
      !registerCredentials.email ||
      !registerCredentials.password
    ) {
      setToastMessage("Please fill in all fields");
      setShowToast(true);
      return;
    }

    if (registerCredentials.password.length < 6) {
      setToastMessage("Password must be at least 6 characters long");
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      await cloudService.register(registerCredentials);
      setShowRegisterModal(false);
      setRegisterCredentials({ name: "", email: "", password: "" });
      setToastMessage(
        "Registration successful! Please login with your new account."
      );
      setShowToast(true);
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    cloudService.clearToken();
    setToastMessage("Logged out successfully");
    setShowToast(true);
  };

  return (
    <IonPage
      className={isDarkMode ? "settings-page-dark" : "settings-page-light"}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontWeight: "bold", fontSize: "1.3em" }}>
            Account Settings
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
        <div className="settings-container">
          {/* Authentication Section */}
          <div className="auth-section">
            <IonCard
              className={isDarkMode ? "auth-card-dark" : "auth-card-light"}
            >
              <div
                className={
                  isDarkMode ? "auth-header-dark" : "auth-header-light"
                }
              >
                <h2 className="auth-title">
                  <IonIcon icon={personCircle} />
                  Account Management
                </h2>
                <p className="auth-subtitle">
                  {cloudService.isAuthenticated()
                    ? "Manage your cloud storage account"
                    : "Connect to access cloud features"}
                </p>
              </div>
              <div className="auth-content">
                {cloudService.isAuthenticated() ? (
                  <>
                    <div
                      className={`auth-status-message ${
                        isDarkMode ? "success-dark" : "success-light"
                      }`}
                    >
                      <IonIcon
                        icon={checkmarkCircle}
                        style={{ marginRight: "8px", fontSize: "1.2em" }}
                      />
                      You are successfully logged in to your cloud account
                    </div>
                    <div className="auth-buttons-container">
                      <IonButton
                        className={`auth-button logout ${
                          isDarkMode ? "dark" : "light"
                        }`}
                        onClick={handleLogout}
                      >
                        <IonIcon icon={logOut} slot="start" />
                        Logout
                      </IonButton>
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        textAlign: "center",
                        marginBottom: "20px",
                        color: isDarkMode ? "#8b949e" : "#656d76",
                      }}
                    >
                      Please login to access your server files and sync your
                      data across devices.
                    </p>
                    <div className="auth-buttons-container">
                      <IonButton
                        className={`auth-button primary ${
                          isDarkMode ? "dark" : "light"
                        }`}
                        onClick={() => setShowLoginModal(true)}
                      >
                        <IonIcon icon={logIn} slot="start" />
                        Login
                      </IonButton>
                      <IonButton
                        className={`auth-button secondary ${
                          isDarkMode ? "dark" : "light"
                        }`}
                        fill="outline"
                        onClick={() => setShowRegisterModal(true)}
                      >
                        <IonIcon icon={personAdd} slot="start" />
                        Register
                      </IonButton>
                    </div>
                  </>
                )}
              </div>
            </IonCard>
          </div>

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
        </div>

        {/* Menu Component (Action Sheet) */}
        <Menu showM={showMenu} setM={() => setShowMenu(false)} />
      </IonContent>

      {/* Login Modal */}
      <IonModal
        isOpen={showLoginModal}
        onDidDismiss={() => setShowLoginModal(false)}
        className={isDarkMode ? "auth-modal-dark" : "auth-modal-light"}
      >
        <IonHeader>
          <IonToolbar className="auth-modal-header">
            <IonTitle className="auth-modal-title">
              <IonIcon icon={logIn} style={{ marginRight: "8px" }} />
              Welcome Back
            </IonTitle>
            <IonButton
              slot="end"
              fill="clear"
              color="light"
              onClick={() => setShowLoginModal(false)}
            >
              Cancel
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent className="auth-modal-content">
          <div style={{ padding: "24px" }}>
            <div className="auth-input-container">
              <IonInput
                className={`auth-input ${isDarkMode ? "dark" : "light"}`}
                label=""
                labelPlacement="stacked"
                type="email"
                value={loginCredentials.email}
                onIonInput={(e) =>
                  setLoginCredentials({
                    ...loginCredentials,
                    email: e.detail.value!,
                  })
                }
                placeholder="Enter your email address"
                required
              />
            </div>
            <div className="auth-input-container">
              <IonInput
                className={`auth-input ${isDarkMode ? "dark" : "light"}`}
                label=""
                labelPlacement="stacked"
                type="password"
                value={loginCredentials.password}
                onIonInput={(e) =>
                  setLoginCredentials({
                    ...loginCredentials,
                    password: e.detail.value!,
                  })
                }
                placeholder="Enter your password"
                required
              />
            </div>
            <IonButton
              expand="block"
              onClick={handleLogin}
              className="auth-submit-button"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? (
                "Signing In..."
              ) : (
                <>
                  <IonIcon icon={logIn} slot="start" />
                  Sign In
                </>
              )}
            </IonButton>
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}
              >
                Don't have an account? Register here
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Register Modal */}
      <IonModal
        isOpen={showRegisterModal}
        onDidDismiss={() => setShowRegisterModal(false)}
        className={isDarkMode ? "auth-modal-dark" : "auth-modal-light"}
      >
        <IonHeader>
          <IonToolbar className="auth-modal-header">
            <IonTitle className="auth-modal-title">
              <IonIcon icon={personAdd} style={{ marginRight: "8px" }} />
              Create Account
            </IonTitle>
            <IonButton
              slot="end"
              fill="clear"
              color="light"
              onClick={() => setShowRegisterModal(false)}
            >
              Cancel
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent className="auth-modal-content">
          <div style={{ padding: "24px" }}>
            <div className="auth-input-container">
              <IonInput
                className={`auth-input ${isDarkMode ? "dark" : "light"}`}
                label=""
                labelPlacement="stacked"
                type="text"
                value={registerCredentials.name}
                onIonInput={(e) =>
                  setRegisterCredentials({
                    ...registerCredentials,
                    name: e.detail.value!,
                  })
                }
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="auth-input-container">
              <IonInput
                className={`auth-input ${isDarkMode ? "dark" : "light"}`}
                type="email"
                value={registerCredentials.email}
                onIonInput={(e) =>
                  setRegisterCredentials({
                    ...registerCredentials,
                    email: e.detail.value!,
                  })
                }
                placeholder="Enter your email address"
                required
              />
            </div>
            <div className="auth-input-container">
              <IonInput
                className={`auth-input ${isDarkMode ? "dark" : "light"}`}
                type="password"
                value={registerCredentials.password}
                onIonInput={(e) =>
                  setRegisterCredentials({
                    ...registerCredentials,
                    password: e.detail.value!,
                  })
                }
                placeholder="Choose a secure password"
                required
              />
            </div>
            <IonButton
              expand="block"
              onClick={handleRegister}
              className="auth-submit-button"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? (
                "Creating Account..."
              ) : (
                <>
                  <IonIcon icon={personAdd} slot="start" />
                  Create Account
                </>
              )}
            </IonButton>
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => {
                  setShowRegisterModal(false);
                  setShowLoginModal(true);
                }}
              >
                Already have an account? Sign in here
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Toast for notifications */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
        color={toastMessage.includes("successful") ? "success" : "danger"}
      />
    </IonPage>
  );
};

export default SettingsPage;
