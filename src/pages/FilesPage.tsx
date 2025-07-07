import React from "react";
import { IonContent, IonPage } from "@ionic/react";
import Files from "../components/Files/Files";
import { useTheme } from "../contexts/ThemeContext";
import { useInvoice } from "../contexts/InvoiceContext";
import { DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { File } from "../components/Storage/LocalStorage";
import { isDefaultFileEmpty, generateUntitledFilename } from "../utils/helper";
import "./FilesPage.css";

const FilesPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { selectedFile, billType, store, updateSelectedFile, updateBillType } =
    useInvoice();

  // Helper function to handle default file logic when switching files
  const handleDefaultFileSwitch = async (): Promise<void> => {
    if (selectedFile === "default") {
      try {
        // Get current content of the default file from the live spreadsheet
        const currentContent = AppGeneral.getSpreadsheetContent();

        console.log(
          "FilesPage: Checking default file content for user data..."
        );

        // Check if the default file has user content (pass raw content)
        if (!isDefaultFileEmpty(currentContent)) {
          // Save current default file as "Untitled" with timestamp
          const untitledName = await generateUntitledFilename(store);
          const encodedContent = encodeURIComponent(currentContent);

          const now = new Date().toISOString();
          const untitledFile = new File(
            now,
            now,
            encodedContent,
            untitledName,
            billType
          );
          await store._saveFile(untitledFile);

          console.log(`FilesPage: Current work saved as "${untitledName}"`);
        } else {
          console.log(
            "FilesPage: Default file appears to be empty or template-only, not saving"
          );
        }

        // Clear the default file (reset to template)
        const device = AppGeneral.getDeviceType();
        const templateData = DATA["home"][device]["msc"];
        const templateContent = encodeURIComponent(
          JSON.stringify(templateData)
        );
        const now2 = new Date().toISOString();
        const defaultFile = new File(
          now2,
          now2,
          templateContent,
          "default",
          1 // Reset to default bill type
        );
        await store._saveFile(defaultFile);
        updateBillType(1); // Reset bill type to default
      } catch (error) {
        console.error("Error handling default file switch:", error);
      }
    }
  };

  return (
    <IonPage className={isDarkMode ? "dark-theme" : ""}>
      <IonContent fullscreen>
        <Files
          store={store}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          updateBillType={updateBillType}
          handleDefaultFileSwitch={handleDefaultFileSwitch}
        />
      </IonContent>
    </IonPage>
  );
};

export default FilesPage;
