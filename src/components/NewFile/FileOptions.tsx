import React, { useState, useRef } from "react";
import {
  IonPopover,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAlert,
  IonToast,
  IonInput,
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import {
  addOutline,
  arrowUndo,
  arrowRedo,
  ellipsisVertical,
  saveOutline,
  documentOutline,
  imageOutline,
  trashOutline,
  close,
  cloudUpload,
  image,
  closeCircle,
  key,
  cameraOutline,
} from "ionicons/icons";
import * as AppGeneral from "../socialcalc/index.js";
import { File } from "../Storage/LocalStorage";
import { DATA } from "../../app-data";
import { useInvoice } from "../../contexts/InvoiceContext";
import { formatDateForFilename } from "../../utils/helper.js";
import { cloudService, Logo } from "../../services/cloud-service";
import { useTheme } from "../../contexts/ThemeContext";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

interface FileOptionsProps {
  showActionsPopover: boolean;
  setShowActionsPopover: (show: boolean) => void;
}

const FileOptions: React.FC<FileOptionsProps> = ({
  showActionsPopover,
  setShowActionsPopover,
}) => {
  const { isDarkMode } = useTheme();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const [showSaveAsAlert, setShowSaveAsAlert] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showLogoAlert, setShowLogoAlert] = useState(false);
  const [device] = useState(AppGeneral.getDeviceType());
  const actionsPopoverRef = useRef<HTMLIonPopoverElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo modal state - moved from Menu
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [userLogos, setUserLogos] = useState<Logo[]>([]);
  const [isLoadingLogos, setIsLoadingLogos] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] =
    useState<globalThis.File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState<Logo | null>(null);
  const [processingLogoId, setProcessingLogoId] = useState<number | null>(null);

  const {
    selectedFile,
    store,
    billType,
    updateSelectedFile,
    updateBillType,
    resetToDefaults,
  } = useInvoice();

  // Utility function to check if Capacitor Camera is available
  const isCameraAvailable = async () => {
    try {
      // Check if we're running in a Capacitor environment
      const { Capacitor } = await import("@capacitor/core");
      return Capacitor.isNativePlatform();
    } catch (error) {
      return false;
    }
  };

  const _validateName = async (filename) => {
    filename = filename.trim();
    if (filename === "default" || filename === "Untitled") {
      setToastMessage(
        "cannot update default or Untitled file! Use Save As Button to save."
      );
      return false;
    } else if (filename === "" || !filename) {
      setToastMessage("Filename cannot be empty");
      return false;
    } else if (filename.length > 30) {
      setToastMessage("Filename too long");
      return false;
    } else if (/^[a-zA-Z0-9- ]*$/.test(filename) === false) {
      setToastMessage("Special Characters cannot be used in filename");
      return false;
    } else if (await store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };

  const handleNewFileClick = async () => {
    try {
      setShowActionsPopover(false);

      // Get the default file from storage
      const defaultExists = await store._checkKey("default");
      if (selectedFile === "default" && defaultExists) {
        const storedDefaultFile = await store._getFile("default");

        // Decode the stored content
        const storedContent = decodeURIComponent(storedDefaultFile.content);
        const msc = DATA["home"][device]["msc"];

        const hasUnsavedChanges = storedContent !== JSON.stringify(msc);

        if (hasUnsavedChanges) {
          // If there are unsaved changes, show confirmation alert
          setShowUnsavedChangesAlert(true);
          return;
        }
      }
      await createNewFile();
    } catch (error) {
      console.error("Error checking for unsaved changes:", error);
      // On error, proceed with normal flow
      setShowUnsavedChangesAlert(true);
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

      setToastMessage("New file created successfully");
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

  const handleUndo = () => {
    AppGeneral.undo();
    // setShowActionsPopover(false);
  };

  const handleRedo = () => {
    AppGeneral.redo();
    // setShowActionsPopover(false);
  };

  const handleSave = async () => {
    if (selectedFile === "default") {
      setToastMessage("Cannot Save Default File, Please use Save As Buton");
      setShowToast(true);
      return;
    }
    // For named files, get existing metadata and update
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
    const data = await store._getFile(selectedFile);
    const file = new File(
      (data as any)?.created || new Date().toISOString(),
      new Date().toISOString(),
      content,
      selectedFile,
      billType
    );
    await store._saveFile(file);
    updateSelectedFile(selectedFile);
    setToastMessage("File saved successfully");
    setShowToast(true);
    setShowActionsPopover(false);
  };

  const handleSaveAs = () => {
    setShowActionsPopover(false);
    const now = new Date();
    setNewFileName("Invoice-" + formatDateForFilename(now));
    setShowSaveAsAlert(true);
  };

  const doSaveAs = async (filename) => {
    // console.log(filename, _validateName(filename));
    const isValid = await _validateName(filename);
    if (isValid) {
      // filename valid . go on save
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
      // console.log(content);
      const now = new Date().toISOString();
      const file = new File(now, now, content, filename, billType);

      store._saveFile(file);

      // reset default file
      if (selectedFile === "default") {
        const msc = DATA["home"][device]["msc"];
        const templateContent = encodeURIComponent(JSON.stringify(msc));
        const newDefaultFile = new File(
          now,
          now,
          templateContent,
          "default",
          1
        );
        await store._saveFile(newDefaultFile);
      }
      updateSelectedFile(filename);
      setToastMessage("File saved as " + filename + " successfully");
      setShowToast(true);

      // setShowAlert4(true);
    } else {
      setShowToast(true);
    }
  };

  const handleAddLogo = () => {
    setShowActionsPopover(false);
    setShowLogoModal(true);
    fetchUserLogos();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const logoData = e.target?.result as string;

        try {
          // Add logo to the spreadsheet using coordinates
          const logoCoordinates = AppGeneral.getLogoCoordinates();
          await AppGeneral.addLogo(logoCoordinates, logoData);

          setToastMessage("Logo added successfully");
          setShowToast(true);
        } catch (error) {
          console.error("Error adding logo:", error);
          setToastMessage("Failed to add logo. Please try again.");
          setShowToast(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setShowActionsPopover(false);
    setShowLogoAlert(true);
  };

  const handleRemoveLogoConfirm = () => {
    try {
      // Get the correct logo coordinates based on device type
      const logoCoordinates = AppGeneral.getLogoCoordinates();
      console.log("Using logo coordinates for removal:", logoCoordinates);

      // Remove logo with proper coordinate object
      AppGeneral.removeLogo(logoCoordinates)
        .then(() => {
          console.log("Logo removed successfully");
          setShowLogoAlert(false);
          setToastMessage("Logo removed successfully");
          setShowToast(true);
        })
        .catch((error) => {
          console.error("Failed to remove logo:", error);
          setToastMessage("Failed to remove logo. Please try again.");
          setShowToast(true);
        });
    } catch (error) {
      console.error("Error removing logo:", error);
      setToastMessage("Error removing logo");
      setShowToast(true);
    }
  };

  // Logo modal functions - moved from Menu
  const fetchUserLogos = async () => {
    if (!cloudService.isAuthenticated()) {
      return;
    }

    setIsLoadingLogos(true);
    try {
      const logos = await cloudService.getLogos();
      setUserLogos(logos);
    } catch (error) {
      console.error("Failed to fetch logos:", error);
      setToastMessage("Failed to fetch logos");
      setShowToast(true);
    } finally {
      setIsLoadingLogos(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Check if Capacitor is available
      const capacitorAvailable = await isCameraAvailable();

      if (!capacitorAvailable) {
        setToastMessage(
          "Camera not available on this platform. Please use file upload instead."
        );
        setShowToast(true);
        return;
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Convert the captured image to a File object for consistency
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();

        // Determine file type from the data URL or default to jpeg
        let mimeType = "image/jpeg";
        let extension = "jpg";

        if (image.dataUrl.startsWith("data:image/png")) {
          mimeType = "image/png";
          extension = "png";
        } else if (image.dataUrl.startsWith("data:image/webp")) {
          mimeType = "image/webp";
          extension = "webp";
        }

        const file = new globalThis.File(
          [blob],
          `camera-logo-${Date.now()}.${extension}`,
          {
            type: mimeType,
          }
        );

        setSelectedLogoFile(file);
        setToastMessage("Photo captured successfully!");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);

      // More specific error handling
      if (
        error.message?.includes("cancelled") ||
        error.message?.includes("canceled")
      ) {
        // User cancelled - don't show error
        return;
      }

      // Handle permission errors specifically
      if (
        error.message?.includes("permission") ||
        error.message?.includes("Permission")
      ) {
        setToastMessage(
          "Permission denied. Please grant camera access in app settings and try again."
        );
        setShowToast(true);
        return;
      }

      // For web or unsupported platforms
      if (
        error.message?.includes("not available") ||
        error.message?.includes("not supported")
      ) {
        setToastMessage(
          "Camera not available on this device. Please use file upload instead."
        );
        setShowToast(true);
        return;
      }

      setToastMessage(
        "Failed to capture photo. Please try again or use file upload instead."
      );
      setShowToast(true);
    }
  };

  const handleGallerySelection = async () => {
    console.log("Gallery selection started...");

    try {
      // Check if Capacitor is available
      const capacitorAvailable = await isCameraAvailable();
      console.log("Capacitor available:", capacitorAvailable);

      if (!capacitorAvailable) {
        console.log("Capacitor not available, falling back to file input");
        // Fallback to file input for web
        const fileInput = document.getElementById(
          "logo-file-input"
        ) as HTMLInputElement;
        fileInput?.click();
        return;
      }

      console.log("Attempting to open gallery...");
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      console.log(
        "Gallery selection successful, image received:",
        !!image.dataUrl
      );

      if (image.dataUrl) {
        // Convert the selected image to a File object for consistency
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();

        // Determine file type from the data URL or default to jpeg
        let mimeType = "image/jpeg";
        let extension = "jpg";

        if (image.dataUrl.startsWith("data:image/png")) {
          mimeType = "image/png";
          extension = "png";
        } else if (image.dataUrl.startsWith("data:image/webp")) {
          mimeType = "image/webp";
          extension = "webp";
        }

        console.log("File type detected:", mimeType);

        const file = new globalThis.File(
          [blob],
          `gallery-logo-${Date.now()}.${extension}`,
          {
            type: mimeType,
          }
        );

        console.log("File created successfully:", file.name, file.size);

        setSelectedLogoFile(file);
        setToastMessage("Photo selected successfully!");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error selecting photo:", error);

      // More specific error handling
      if (
        error.message?.includes("cancelled") ||
        error.message?.includes("canceled")
      ) {
        console.log("User cancelled photo selection");
        // User cancelled - don't show error
        return;
      }

      // Handle permission errors specifically
      if (
        error.message?.includes("permission") ||
        error.message?.includes("Permission")
      ) {
        console.log("Permission denied for gallery access");
        setToastMessage(
          "Permission denied. Please grant camera/gallery access in app settings and try again."
        );
        setShowToast(true);

        // Fallback to file input
        const fileInput = document.getElementById(
          "logo-file-input"
        ) as HTMLInputElement;
        fileInput?.click();
        return;
      }

      // For web or unsupported platforms, fallback to file input
      if (
        error.message?.includes("not available") ||
        error.message?.includes("not supported")
      ) {
        console.log("Camera/Gallery not available, showing fallback message");
        setToastMessage(
          "Camera not available. Please use file upload instead."
        );
        setShowToast(true);

        // Fallback to file input
        const fileInput = document.getElementById(
          "logo-file-input"
        ) as HTMLInputElement;
        fileInput?.click();
        return;
      }

      console.log("Unknown error occurred:", error.message);
      setToastMessage(
        "Failed to select photo. Please try again or use file upload instead."
      );
      setShowToast(true);

      // Always provide fallback option
      setTimeout(() => {
        const fileInput = document.getElementById(
          "logo-file-input"
        ) as HTMLInputElement;
        fileInput?.click();
      }, 2000);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setToastMessage(
          "Invalid file type. Only images are allowed (PNG, JPG, JPEG, GIF, WebP, SVG)"
        );
        setShowToast(true);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage("File size too large. Maximum 5MB allowed");
        setShowToast(true);
        return;
      }

      setSelectedLogoFile(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) {
      setToastMessage("Please select a logo file");
      setShowToast(true);
      return;
    }

    if (!cloudService.isAuthenticated()) {
      setToastMessage(
        "You're not logged in. Please login to use this feature."
      );
      setShowToast(true);
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await cloudService.uploadLogo(selectedLogoFile);
      setToastMessage("Logo uploaded successfully!");
      setShowToast(true);
      setSelectedLogoFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "logo-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh logos list
      await fetchUserLogos();
    } catch (error) {
      console.error("Failed to upload logo:", error);
      setToastMessage("Failed to upload logo. Please try again.");
      setShowToast(true);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleApplyDirectly = async () => {
    if (!selectedLogoFile) {
      setToastMessage("Please select a logo file");
      setShowToast(true);
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Convert selected file to base64
      const logoData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(selectedLogoFile);
      });

      // Get the correct logo coordinates based on device type
      const logoCoordinates = AppGeneral.getLogoCoordinates();
      console.log("Using logo coordinates for direct apply:", logoCoordinates);

      // Add logo directly to the spreadsheet
      await AppGeneral.addLogo(logoCoordinates, logoData);

      setToastMessage("Logo applied directly to invoice!");
      setShowToast(true);
      setSelectedLogoFile(null);

      // Reset file inputs
      const fileInput = document.getElementById(
        "logo-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Close the modal
      setShowLogoModal(false);
    } catch (error) {
      console.error("Failed to apply logo directly:", error);
      setToastMessage("Failed to apply logo. Please try again.");
      setShowToast(true);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSelectLogo = async (logo: Logo) => {
    try {
      setProcessingLogoId(logo.id);

      let logoData: string;

      try {
        // Try to convert URL to base64 using the cloud service
        const conversionResult = await cloudService.convertUrlToBase64(
          logo.logo_url
        );
        logoData = conversionResult.data_url; // Use the full data URL format
        console.log("Logo successfully converted to base64");
        setToastMessage("Logo converted successfully!");
        setShowToast(true);
      } catch (conversionError) {
        console.warn("Failed to convert logo to base64:", conversionError);
        setToastMessage("Failed to Fetch Logo");
        setShowToast(true);
        return;
      }

      // Get the correct logo coordinates based on device type
      const logoCoordinates = AppGeneral.getLogoCoordinates();
      console.log("Using logo coordinates:", logoCoordinates);

      // Add logo with proper coordinate object and logo data (base64 or URL)
      await AppGeneral.addLogo(logoCoordinates, logoData);

      console.log("Logo added successfully");
      setToastMessage("Logo added successfully!");
      setShowToast(true);
      setShowLogoModal(false);
    } catch (error) {
      console.error("Failed to add logo:", error);
      setToastMessage("Failed to add logo. Please try again.");
      setShowToast(true);
    } finally {
      setProcessingLogoId(null);
    }
  };

  const handleDeleteLogo = async (logoId: number) => {
    if (!cloudService.isAuthenticated()) {
      setToastMessage(
        "You're not logged in. Please login to use this feature."
      );
      setShowToast(true);
      return;
    }

    try {
      await cloudService.deleteLogo(logoId);
      setToastMessage("Logo deleted successfully!");
      setShowToast(true);
      // Refresh logos list
      await fetchUserLogos();
    } catch (error) {
      console.error("Failed to delete logo:", error);
      setToastMessage("Failed to delete logo. Please try again.");
      setShowToast(true);
    }
  };

  const handleDeleteConfirm = (logo: Logo) => {
    setLogoToDelete(logo);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (logoToDelete) {
      await handleDeleteLogo(logoToDelete.id);
      setShowDeleteConfirm(false);
      setLogoToDelete(null);
    }
  };

  return (
    <React.Fragment>
      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleLogoUpload}
      />

      {/* Actions Popover */}
      <IonPopover
        ref={actionsPopoverRef}
        trigger="actions-trigger"
        isOpen={showActionsPopover}
        onDidDismiss={() => setShowActionsPopover(false)}
        showBackdrop={true}
      >
        <IonContent className="ion-no-padding">
          <IonList className="ion-no-padding">
            <IonItem button onClick={handleNewFileClick}>
              <IonLabel>New File</IonLabel>
              <IonIcon icon={addOutline} slot="end" />
            </IonItem>
            <IonItem button onClick={handleSave}>
              <IonLabel>Save</IonLabel>
              <IonIcon icon={saveOutline} slot="end" />
            </IonItem>
            <IonItem button onClick={handleSaveAs}>
              <IonLabel>Save As</IonLabel>
              <IonIcon icon={documentOutline} slot="end" />
            </IonItem>
            <IonItem button onClick={handleAddLogo}>
              <IonLabel>Add Logo</IonLabel>
              <IonIcon icon={imageOutline} slot="end" />
            </IonItem>
            <IonItem button onClick={handleRemoveLogo}>
              <IonLabel>Remove Logo</IonLabel>
              <IonIcon icon={trashOutline} slot="end" />
            </IonItem>
            <IonItem button onClick={handleUndo}>
              <IonLabel>Undo</IonLabel>
              <IonIcon icon={arrowUndo} slot="end" />
            </IonItem>
            <IonItem button onClick={handleRedo}>
              <IonLabel>Redo</IonLabel>
              <IonIcon icon={arrowRedo} slot="end" />
            </IonItem>
          </IonList>
        </IonContent>
      </IonPopover>

      {/* Save As Alert */}
      <IonAlert
        isOpen={showSaveAsAlert}
        onDidDismiss={() => setShowSaveAsAlert(false)}
        header="Save As"
        message="Enter a name for the file:"
        inputs={[
          {
            name: "fileName",
            type: "text",
            placeholder: "File name",
            value: newFileName,
          },
        ]}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowSaveAsAlert(false);
            },
          },
          {
            text: "Save",
            handler: (data) => {
              doSaveAs(data.fileName);
            },
          },
        ]}
      />

      {/* Remove Logo Confirmation Alert */}
      <IonAlert
        isOpen={showLogoAlert}
        onDidDismiss={() => setShowLogoAlert(false)}
        header="Remove Logo"
        message="Are you sure you want to remove the logo?"
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowLogoAlert(false);
            },
          },
          {
            text: "Remove",
            handler: () => {
              handleRemoveLogoConfirm();
            },
          },
        ]}
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

      {/* Logo Modal - moved from Menu */}
      <IonModal
        isOpen={showLogoModal}
        onDidDismiss={() => setShowLogoModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Manage Logos</IonTitle>
            <IonButton
              fill="clear"
              slot="end"
              color={isDarkMode ? "light" : "dark"}
              onClick={() => setShowLogoModal(false)}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {/* Upload Section - Always visible */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Upload New Logo</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size={device === "default" ? "12" : "6"}>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={() => {
                        if (device === "default") {
                          // Use traditional file input for desktop/web
                          const fileInput = document.getElementById(
                            "logo-file-input"
                          ) as HTMLInputElement;
                          fileInput?.click();
                        } else {
                          // Use Capacitor gallery selection for mobile (includes fallback)
                          handleGallerySelection();
                        }
                      }}
                    >
                      <IonIcon icon={image} slot="start" />
                      Choose File
                    </IonButton>
                  </IonCol>
                  {device !== "default" && (
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill="outline"
                        onClick={handleCameraCapture}
                      >
                        <IonIcon icon={cameraOutline} slot="start" />
                        Camera
                      </IonButton>
                    </IonCol>
                  )}
                </IonRow>
              </IonGrid>

              {/* Hidden inputs */}
              <input
                type="file"
                accept="image/*"
                id="logo-file-input"
                onChange={handleLogoFileChange}
                style={{ display: "none" }}
              />

              {selectedLogoFile && (
                <IonItem>
                  <IonLabel>
                    <p>Selected: {selectedLogoFile.name}</p>
                    <p>
                      Size: {(selectedLogoFile.size / 1024 / 1024).toFixed(2)}{" "}
                      MB
                    </p>
                  </IonLabel>
                </IonItem>
              )}

              {/* Action buttons for selected file */}
              {selectedLogoFile && (
                <>
                  <IonGrid style={{ marginTop: "10px" }}>
                    <IonRow>
                      <IonCol size="6">
                        <IonButton
                          expand="block"
                          fill="outline"
                          disabled={isUploadingLogo}
                          onClick={handleApplyDirectly}
                        >
                          <IonIcon icon={imageOutline} slot="start" />
                          Apply Directly
                        </IonButton>
                      </IonCol>
                      <IonCol size="6">
                        <IonButton
                          expand="block"
                          disabled={
                            isUploadingLogo || !cloudService.isAuthenticated()
                          }
                          onClick={handleUploadLogo}
                        >
                          {isUploadingLogo ? (
                            <>
                              <IonSpinner name="crescent" /> Uploading...
                            </>
                          ) : (
                            <>
                              <IonIcon icon={cloudUpload} slot="start" />
                              Save to Server
                            </>
                          )}
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </IonGrid>

                  {/* Help text for button actions */}
                  <div
                    style={{
                      marginTop: "15px",
                      fontSize: "0.9em",
                      color: "var(--ion-color-medium)",
                    }}
                  >
                    <p style={{ margin: "5px 0" }}>
                      <strong>Apply Directly:</strong> Use the logo immediately
                      on this invoice
                    </p>
                    <p style={{ margin: "5px 0" }}>
                      <strong>Save to Server:</strong>{" "}
                      {cloudService.isAuthenticated()
                        ? "Upload to cloud for reuse across devices"
                        : "Please login to save logos to server"}
                    </p>
                    {device !== "default" && (
                      <p
                        style={{
                          margin: "5px 0",
                          fontSize: "0.8em",
                          fontStyle: "italic",
                        }}
                      >
                        <strong>Note:</strong> Camera and photo gallery access
                        powered by Capacitor for better mobile experience
                      </p>
                    )}
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>

          {/* Logos List Section - Now with authentication check */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Your Uploaded Logos</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {!cloudService.isAuthenticated() ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <IonIcon icon={key} size="large" color="warning" />
                  <h3>Please login to save your logos</h3>
                  <p>You can still apply logos directly without logging in</p>
                </div>
              ) : isLoadingLogos ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <IonSpinner name="crescent" />
                  <p>Loading logos...</p>
                </div>
              ) : userLogos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <IonIcon icon={image} size="large" color="medium" />
                  <p>No logos uploaded yet</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                  }}
                >
                  {userLogos.map((logo) => (
                    <div
                      key={logo.id}
                      style={{
                        position: "relative",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "8px",
                        backgroundColor: "#f9f9f9",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        width: "120px",
                        height: "100px",
                        flexShrink: 0,
                      }}
                      onClick={() => handleSelectLogo(logo)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 4px 8px rgba(0,0,0,0.2)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <img
                        src={logo.logo_url}
                        alt={logo.filename}
                        style={{
                          width: "100%",
                          height: "80px",
                          objectFit: "contain",
                          borderRadius: "4px",
                        }}
                      />

                      {/* Processing overlay */}
                      {processingLogoId === logo.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "0",
                            left: "0",
                            right: "0",
                            bottom: "0",
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "8px",
                            zIndex: 10,
                          }}
                        >
                          <IonSpinner name="crescent" color="light" />
                        </div>
                      )}

                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfirm(logo);
                        }}
                        style={{
                          position: "absolute",
                          top: "-5px",
                          right: "-5px",
                          minHeight: "24px",
                          minWidth: "24px",
                          "--padding-start": "0",
                          "--padding-end": "0",
                          "--padding-top": "0",
                          "--padding-bottom": "0",
                          backgroundColor: isDarkMode
                            ? "rgba(0, 0, 0, 0.8)"
                            : "rgba(255, 255, 255, 0.9)",
                          borderRadius: "50%",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          border: isDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(0, 0, 0, 0.1)",
                          "--color": "#dc3545",
                        }}
                      >
                        <IonIcon
                          icon={closeCircle}
                          size="small"
                          style={{
                            color: "#dc3545 !important",
                            fill: "#dc3545 !important",
                            filter: isDarkMode
                              ? "drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                              : "drop-shadow(0 1px 2px rgba(255,255,255,0.8))",
                          }}
                        />
                      </IonButton>
                    </div>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonModal>

      {/* Delete Confirmation Alert */}
      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header="Delete Logo"
        message={`Are you sure you want to delete "${logoToDelete?.filename}"? This will remove access to it wherever this logo is being used in your files.`}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowDeleteConfirm(false);
              setLogoToDelete(null);
            },
          },
          {
            text: "Delete",
            role: "destructive",
            handler: confirmDelete,
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

export default FileOptions;
