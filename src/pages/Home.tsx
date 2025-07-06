import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonToast,
  IonAlert,
} from "@ionic/react";
import { APP_NAME, DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { useEffect, useState, useRef } from "react";
import { Local, File } from "../components/Storage/LocalStorage";
import {
  checkmark,
  checkmarkCircle,
  pencil,
  saveSharp,
  syncOutline,
  arrowUndo,
  arrowRedo,
} from "ionicons/icons";
import "./Home.css";
import NewFile from "../components/NewFile/NewFile";
import Menu from "../components/Menu/Menu";
import { useTheme } from "../contexts/ThemeContext";
import { useInvoice } from "../contexts/InvoiceContext";
import { isDefaultFileEmpty, generateUntitledFilename } from "../utils/helper";

const Home: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { selectedFile, billType, store, updateSelectedFile, updateBillType } =
    useInvoice();

  const [showMenu, setShowMenu] = useState(false);
  const [device] = useState(AppGeneral.getDeviceType());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState<
    "success" | "danger" | "warning"
  >("success");

  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsFileName, setSaveAsFileName] = useState("");
  const [saveAsOperation, setSaveAsOperation] = useState<"local" | null>(null);

  // Helper function to handle default file logic when switching files
  const handleDefaultFileSwitch = async (): Promise<void> => {
    if (selectedFile === "default") {
      try {
        // Get current content of the default file from the live spreadsheet
        const currentContent = AppGeneral.getSpreadsheetContent();

        console.log("Checking default file content for user data...");
        console.log(
          "Current content preview:",
          currentContent.substring(0, 200)
        );

        // Check if the default file has user content (pass raw content)
        if (!isDefaultFileEmpty(currentContent)) {
          // Save current default file as "Untitled" with timestamp
          const untitledName = await generateUntitledFilename(store);
          const encodedContent = encodeURIComponent(currentContent);

          const untitledFile = new File(
            new Date().toString(),
            new Date().toString(),
            encodedContent,
            untitledName,
            billType
          );
          await store._saveFile(untitledFile);

          console.log(`Saved current work as "${untitledName}"`);

          // Show toast notification
          setToastMessage(`Current work saved as "${untitledName}"`);
          setToastColor("success");
          setShowToast(true);
        } else {
          console.log(
            "Default file appears to be empty or template-only, not saving"
          );
        }

        // Clear the default file (reset to template)
        const templateData = DATA["home"][device]["msc"];
        const templateContent = encodeURIComponent(
          JSON.stringify(templateData)
        );
        const defaultFile = new File(
          new Date().toString(),
          new Date().toString(),
          templateContent,
          "default",
          1 // Reset to default bill type
        );
        await store._saveFile(defaultFile);
        updateBillType(1); // Reset bill type to default
      } catch (error) {
        console.error("Error handling default file switch:", error);
        setToastMessage("Error saving current work");
        setToastColor("danger");
        setShowToast(true);
      }
    }
  };

  const activateFooter = (footer) => {
    AppGeneral.activateFooterButton(footer);
  };

  const executeSaveAsWithFilename = async (filename: string) => {
    updateSelectedFile(filename);

    if (saveAsOperation === "local") {
      await performLocalSave(filename);
    }
    setSaveAsFileName("");
    setSaveAsOperation(null);
  };
  const performLocalSave = async (fileName: string) => {
    try {
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
      const file = new File(
        new Date().toString(),
        new Date().toString(),
        content,
        fileName,
        billType
      );
      await store._saveFile(file);

      setToastMessage(`File "${fileName}" saved locally!`);
      setToastColor("success");
      setShowToast(true);
    } catch (error) {
      console.error("Error saving file:", error);
      setToastMessage("Failed to save file locally.");
      setToastColor("danger");
      setShowToast(true);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First try to load the default file from local storage
        const defaultExists = await store._checkKey("default");
        if (defaultExists) {
          const defaultFile = await store._getFile("default");
          const decodedContent = decodeURIComponent(defaultFile.content);
          AppGeneral.viewFile("default", decodedContent);
          updateBillType(defaultFile.billType);
          console.log("Loaded existing default file from local storage");
        } else {
          // If no default file exists, initialize with template data and save it
          const data = DATA["home"][device]["msc"];
          AppGeneral.initializeApp(JSON.stringify(data));

          // Save the initial template as the default file
          const initialContent = encodeURIComponent(JSON.stringify(data));
          const file = new File(
            new Date().toString(),
            new Date().toString(),
            initialContent,
            "default",
            billType
          );
          await store._saveFile(file);
          console.log("Created and saved new default file");
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        // Fallback to template initialization
        const data = DATA["home"][device]["msc"];
        AppGeneral.initializeApp(JSON.stringify(data));
      }
    };

    initializeApp();
  }, []);

  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleAutoSave = async () => {
    console.log("Auto-saving file...");
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());

    if (selectedFile === "default") {
      // Autosave the default file to local storage
      const file = new File(
        new Date().toString(),
        new Date().toString(),
        content,
        "default",
        billType
      );
      await store._saveFile(file);
      return;
    }

    // For named files, get existing metadata and update
    const data = await store._getFile(selectedFile);
    const file = new File(
      (data as any)?.created || new Date().toString(),
      new Date().toString(),
      content,
      selectedFile,
      billType
    );
    await store._saveFile(file);
    updateSelectedFile(selectedFile);
  };
  useEffect(() => {
    const debouncedAutoSave = () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      const newTimer = setTimeout(() => {
        handleAutoSave();
        setAutoSaveTimer(null);
      }, 1000);

      setAutoSaveTimer(newTimer);
    };

    const removeListener = AppGeneral.setupCellChangeListener((_) => {
      debouncedAutoSave();
    });

    return () => {
      removeListener();
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [selectedFile, billType, autoSaveTimer]);

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

  const footers = DATA["home"][device]["footers"];
  const footersList = footers.map((footerArray) => {
    const isActive = footerArray.index === billType;

    return (
      <IonButton
        key={footerArray.index}
        color="light"
        className="ion-no-margin"
        style={{
          whiteSpace: "nowrap",
          minWidth: "max-content",
          marginRight: "8px",
          flexShrink: 0,
          border: isActive ? "2px solid #3880ff" : "2px solid transparent",
          borderRadius: "4px",
        }}
        onClick={() => {
          updateBillType(footerArray.index);
          activateFooter(footerArray.index);
        }}
      >
        {footerArray.name}
      </IonButton>
    );
  });

  return (
    <IonPage
      className={isDarkMode ? "dark-theme" : ""}
      // style={{ overflow: "hidden", maxHeight: "80vh" }}
    >
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle slot="start" className="editing-title">
            <div style={{ display: "flex", alignItems: "center" }}>
              <IonIcon
                icon={pencil}
                size="medium"
                style={{ marginRight: "8px" }}
              />
              <span>{selectedFile}</span>
              {selectedFile !== "default" && (
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={handleAutoSave}
                  disabled={autoSaveTimer !== null}
                  style={{
                    marginLeft: "12px",
                    minWidth: "auto",
                    height: "32px",
                  }}
                >
                  <IonIcon
                    icon={autoSaveTimer ? syncOutline : checkmarkCircle}
                    size="small"
                    color={"success"}
                    style={{
                      animation: autoSaveTimer
                        ? "spin 1s linear infinite"
                        : "none",
                    }}
                  />
                </IonButton>
              )}
            </div>
          </IonTitle>

          <IonButtons slot="end" className="ion-padding-end">
            <IonIcon
              icon={arrowUndo}
              size="large"
              onClick={() => AppGeneral.undo()}
              style={{ cursor: "pointer", marginRight: "12px" }}
            />
            <IonIcon
              icon={arrowRedo}
              size="large"
              onClick={() => AppGeneral.redo()}
              style={{ cursor: "pointer", marginRight: "12px" }}
            />
            <div style={{ marginRight: "12px" }}>
              <NewFile
                data-testid="new-file-btn"
                handleDefaultFileSwitch={handleDefaultFileSwitch}
              />
            </div>
            <IonIcon
              icon={saveSharp}
              size="large"
              onClick={(e) => {
                setShowMenu(true);
              }}
              style={{ cursor: "pointer", marginRight: "12px" }}
            />
          </IonButtons>
        </IonToolbar>
        <IonToolbar color="secondary">
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              overflowX: "auto",
              padding: "8px 16px",
              width: "100%",
              alignItems: "center",
            }}
          >
            {footersList}
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div id="container">
          <div id="workbookControl"></div>
          <div id="tableeditor"></div>
          <div id="msg"></div>
        </div>

        {/* Toast for save notifications */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          position="top"
        />

        {/* Save As Dialog */}
        <IonAlert
          isOpen={showSaveAsDialog}
          onDidDismiss={() => {
            setShowSaveAsDialog(false);
            setSaveAsFileName("");
            setSaveAsOperation(null);
          }}
          header="Save As - Local Storage"
          message="Enter a filename for your invoice:"
          inputs={[
            {
              name: "filename",
              type: "text",
              placeholder: "Enter filename...",
              value: saveAsFileName,
              attributes: {
                maxlength: 50,
              },
            },
          ]}
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                setSaveAsFileName("");
                setSaveAsOperation(null);
              },
            },
            {
              text: "Save",
              handler: (data) => {
                if (data.filename && data.filename.trim()) {
                  setSaveAsFileName(data.filename.trim());
                  // Close dialog and execute save
                  setShowSaveAsDialog(false);
                  // Use setTimeout to ensure state updates
                  setTimeout(async () => {
                    await executeSaveAsWithFilename(data.filename.trim());
                  }, 100);
                } else {
                  setToastMessage("Please enter a valid filename");
                  setToastColor("warning");
                  setShowToast(true);
                  return false; // Prevent dialog from closing
                }
              },
            },
          ]}
        />
        <Menu showM={showMenu} setM={() => setShowMenu(false)} />
      </IonContent>
    </IonPage>
  );
};

export default Home;
