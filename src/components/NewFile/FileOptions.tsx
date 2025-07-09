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

  const {
    selectedFile,
    store,
    billType,
    updateSelectedFile,
    updateBillType,
    resetToDefaults,
  } = useInvoice();

  /* Utility functions */
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
      reader.onload = (e) => {
        const logoData = e.target?.result as string;
        // Add logo to the spreadsheet
        AppGeneral.addLogo(logoData);
        setToastMessage("Logo added successfully");
        setShowToast(true);
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

      if (device !== "default") {
        const cameraInput = document.getElementById(
          "logo-camera-input"
        ) as HTMLInputElement;
        if (cameraInput) cameraInput.value = "";
      }

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

  const handleSelectLogo = async (logoUrl: string) => {
    try {
      // Get the correct logo coordinates based on device type
      const logoCoordinates = AppGeneral.getLogoCoordinates();
      console.log("Using logo coordinates:", logoCoordinates);

      // Add logo with proper coordinate object and URL
      await AppGeneral.addLogo(logoCoordinates, logoUrl);

      console.log("Logo added successfully");
      setToastMessage("Logo added successfully!");
      setShowToast(true);
      setShowLogoModal(false);
    } catch (error) {
      console.error("Failed to add logo:", error);
      setToastMessage("Failed to add logo. Please try again.");
      setShowToast(true);
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
          {!cloudService.isAuthenticated() ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <IonIcon icon={key} size="large" color="warning" />
              <h3>Authentication Required</h3>
              <p>You're not logged in. Please login to use this feature.</p>
              <IonButton fill="outline" onClick={() => setShowLogoModal(false)}>
                Close
              </IonButton>
            </div>
          ) : (
            <>
              {/* Upload Section */}
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
                            const fileInput = document.getElementById(
                              "logo-file-input"
                            ) as HTMLInputElement;
                            fileInput?.click();
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
                            onClick={() => {
                              const cameraInput = document.getElementById(
                                "logo-camera-input"
                              ) as HTMLInputElement;
                              cameraInput?.click();
                            }}
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
                  {device !== "default" && (
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="logo-camera-input"
                      onChange={handleLogoFileChange}
                      style={{ display: "none" }}
                    />
                  )}

                  {selectedLogoFile && (
                    <IonItem>
                      <IonLabel>
                        <p>Selected: {selectedLogoFile.name}</p>
                        <p>
                          Size:{" "}
                          {(selectedLogoFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonButton
                    expand="block"
                    disabled={!selectedLogoFile || isUploadingLogo}
                    onClick={handleUploadLogo}
                    style={{ marginTop: "10px" }}
                  >
                    {isUploadingLogo ? (
                      <>
                        <IonSpinner name="crescent" /> Uploading...
                      </>
                    ) : (
                      <>
                        <IonIcon icon={cloudUpload} slot="start" />
                        Upload Logo
                      </>
                    )}
                  </IonButton>
                </IonCardContent>
              </IonCard>

              {/* Logos List Section */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Your Uploaded Logos</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {isLoadingLogos ? (
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
                          onClick={() => handleSelectLogo(logo.logo_url)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 4px 8px rgba(0,0,0,0.2)";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
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
            </>
          )}
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
