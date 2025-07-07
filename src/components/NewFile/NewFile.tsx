import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { DATA } from "../../app-data";
import { IonAlert, IonIcon, IonToast } from "@ionic/react";
import { add, addCircle, addOutline, documentText } from "ionicons/icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useInvoice } from "../../contexts/InvoiceContext";
import { addIcons } from "ionicons";
import {
  isDefaultFileEmpty,
  generateUntitledFilename,
} from "../../utils/helper";

const NewFile: React.FC<{
  handleDefaultFileSwitch?: () => Promise<void>;
}> = ({ handleDefaultFileSwitch }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showNewInvoiceAlert, setShowNewInvoiceAlert] = useState(false);
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const { isDarkMode } = useTheme();
  const [device] = useState(AppGeneral.getDeviceType());
  const { selectedFile, billType, store, updateSelectedFile, resetToDefaults } =
    useInvoice();

  const handleNewFileClick = async () => {
    try {
      // Check if the default file has unsaved changes
      const currentSpreadsheetContent = AppGeneral.getSpreadsheetContent();
      console.log("Checking default file for unsaved changes...");

      // Only check if we're currently on the default file
      if (selectedFile === "default") {
        const isEmpty = isDefaultFileEmpty(currentSpreadsheetContent);
        console.log("Default file empty:", isEmpty);

        if (!isEmpty) {
          // Default file has unsaved changes, show confirmation dialog
          setShowUnsavedChangesAlert(true);
          return;
        }
      }

      // No unsaved changes, proceed directly
      setShowNewInvoiceAlert(true);
    } catch (error) {
      console.error("Error checking for unsaved changes:", error);
      // On error, proceed with normal flow
      setShowNewInvoiceAlert(true);
    }
  };

  const createNewFile = async () => {
    try {
      // Reset to defaults first
      resetToDefaults();

      // Set selected file to "default"
      updateSelectedFile("default");

      const msc = DATA["home"][device]["msc"];

      // Load the template data into the spreadsheet
      AppGeneral.viewFile("default", JSON.stringify(msc));

      // Save the new template as the default file in storage
      const templateContent = encodeURIComponent(JSON.stringify(msc));
      const now = new Date().toISOString();
      const newDefaultFile = new File(now, now, templateContent, "default", 1);
      await store._saveFile(newDefaultFile);

      console.log("Created new default file with template data");

      setToastMessage("New invoice created");
      setShowToast(true);
    } catch (error) {
      console.error("Error creating new file:", error);
      setToastMessage("Error creating new invoice");
      setShowToast(true);
    }
  };

  const handleDiscardAndCreateNew = async () => {
    try {
      // User confirmed to discard changes, proceed with creating new file
      await createNewFile();
      setShowUnsavedChangesAlert(false);
    } catch (error) {
      console.error("Error discarding and creating new file:", error);
      setToastMessage("Error creating new invoice");
      setShowToast(true);
      setShowUnsavedChangesAlert(false);
    }
  };

  return (
    <React.Fragment>
      <IonIcon
        icon={addCircle}
        slot="end"
        className="new-file-icon"
        size="large"
        data-testid="new-file-btn"
        onClick={handleNewFileClick}
        title="Create New File"
      />

      {/* Unsaved Changes Confirmation Alert */}
      <IonAlert
        isOpen={showUnsavedChangesAlert}
        onDidDismiss={() => setShowUnsavedChangesAlert(false)}
        header="⚠️ Unsaved Changes"
        message="The default file has unsaved changes. Creating a new file will discard these changes. Do you want to continue?"
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowUnsavedChangesAlert(false);
            },
          },
          {
            text: "Discard & Create New",
            handler: async () => {
              await handleDiscardAndCreateNew();
            },
          },
        ]}
      />

      {/* New Invoice Confirmation Alert */}
      <IonAlert
        isOpen={showNewInvoiceAlert}
        onDidDismiss={() => setShowNewInvoiceAlert(false)}
        header="📄 Create New Invoice"
        message="Do you want to create a new invoice? Make sure you have saved your currently working invoice."
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowNewInvoiceAlert(false);
            },
          },
          {
            text: "Create New",
            handler: async () => {
              await createNewFile();
              setShowNewInvoiceAlert(false);
            },
          },
        ]}
      />

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        color={toastMessage.includes("successfully") ? "success" : "warning"}
        position="top"
      />
    </React.Fragment>
  );
};

export default NewFile;
