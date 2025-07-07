import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import {
  isPlatform,
  IonToast,
  IonLoading,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import {
  saveOutline,
  save,
  mail,
  print,
  cloudUpload,
  download,
  documentOutline,
  documents,
  key,
  server,
  close,
  trash,
  image,
  checkmark,
  closeCircle,
} from "ionicons/icons";
import { APP_NAME } from "../../app-data";
import { useTheme } from "../../contexts/ThemeContext";
import { useInvoice } from "../../contexts/InvoiceContext";
import { exportHTMLAsPDF } from "../../services/exportAsPdf.js";
import { exportAllSheetsAsPDF } from "../../services/exportAllSheetsAsPdf";
import { exportCSV, parseSocialCalcCSV } from "../../services/exportAsCsv";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import MenuDialogs from "./MenuDialogs.js";
import { cloudService, Logo } from "../../services/cloud-service";

const Menu: React.FC<{
  showM: boolean;
  setM: Function;
}> = (props) => {
  const { isDarkMode } = useTheme();
  const { selectedFile, billType, store, updateSelectedFile } = useInvoice();

  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [showAlert4, setShowAlert4] = useState(false);
  const [showAlert6, setShowAlert6] = useState(false); // For PDF filename
  const [showAlert7, setShowAlert7] = useState(false); // For CSV filename
  const [showAlert8, setShowAlert8] = useState(false); // For export all PDF filename
  const [showAlert9, setShowAlert9] = useState(false); // For password protection
  const [showAlert10, setShowAlert10] = useState(false); // For password input when loading
  const [showAlert11, setShowAlert11] = useState(false); // For server save filename
  const [showToast1, setShowToast1] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isExportingAllPDF, setIsExportingAllPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [exportAllProgress, setExportAllProgress] = useState("");
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [filePassword, setFilePassword] = useState("");
  const [currentFileForPassword, setCurrentFileForPassword] = useState("");

  // Logo modal state
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [userLogos, setUserLogos] = useState<Logo[]>([]);
  const [isLoadingLogos, setIsLoadingLogos] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] =
    useState<globalThis.File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState<Logo | null>(null);

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
      setToastMessage("Special Characters cannot be used");
      return false;
    } else if (await store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };

  const getCurrentFileName = () => {
    return selectedFile;
  };

  const _formatString = (filename) => {
    /* Remove whitespaces */
    while (filename.indexOf(" ") !== -1) {
      filename = filename.replace(" ", "");
    }
    return filename;
  };

  const doPrint = () => {
    if (isPlatform("hybrid")) {
      const printer = Printer;
      printer.print(AppGeneral.getCurrentHTMLContent());
    } else {
      const content = AppGeneral.getCurrentHTMLContent();
      // useReactToPrint({ content: () => content });
      const printWindow = window.open("/printwindow", "Print Invoice");
      printWindow.document.write(content);
      printWindow.print();
    }
  };

  const doGeneratePDF = async (filename?: string) => {
    try {
      setIsGeneratingPDF(true);
      setPdfProgress("Preparing content for PDF...");

      // Get the current HTML content from the spreadsheet
      const htmlContent = AppGeneral.getCurrentHTMLContent();

      if (!htmlContent || htmlContent.trim() === "") {
        setToastMessage("No content available to export as PDF");
        setShowToast1(true);
        setIsGeneratingPDF(false);
        return;
      }

      const pdfFilename = filename || selectedFile || "invoice";

      // Check if we're on a mobile device
      if (isPlatform("hybrid") || isPlatform("mobile")) {
        // Generate PDF as blob for sharing on mobile
        const pdfBlob = await exportHTMLAsPDF(htmlContent, {
          filename: pdfFilename,
          format: "a4",
          orientation: "portrait",
          margin: 10,
          quality: 2,
          returnBlob: true,
          onProgress: (message: string) => {
            setPdfProgress(message);
          },
        });

        if (pdfBlob) {
          try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              const base64 = base64Data.split(",")[1]; // Remove data:application/pdf;base64, prefix

              try {
                // Save to temporary file
                const tempFile = await Filesystem.writeFile({
                  path: `${pdfFilename}.pdf`,
                  data: base64,
                  directory: Directory.Cache,
                });

                // Share the file
                await Share.share({
                  title: `${pdfFilename}.pdf`,
                  text: "Invoice PDF generated successfully",
                  url: tempFile.uri,
                  dialogTitle: "Share PDF",
                });

                setToastMessage(`PDF generated and ready to share!`);
                setShowToast1(true);
              } catch (shareError) {
                console.log("Error sharing PDF:", shareError);
                // Fallback: still generate PDF normally
                await exportHTMLAsPDF(htmlContent, {
                  filename: pdfFilename,
                  format: "a4",
                  orientation: "portrait",
                  margin: 10,
                  quality: 2,
                  onProgress: (message: string) => {
                    setPdfProgress(message);
                  },
                });
                setToastMessage(`PDF saved as ${pdfFilename}.pdf`);
                setShowToast1(true);
              }
            };
            reader.readAsDataURL(pdfBlob as Blob);
          } catch (error) {
            console.error("Error processing PDF for sharing:", error);
            // Fallback to normal PDF generation
            await exportHTMLAsPDF(htmlContent, {
              filename: pdfFilename,
              format: "a4",
              orientation: "portrait",
              margin: 10,
              quality: 2,
              onProgress: (message: string) => {
                setPdfProgress(message);
              },
            });
            setToastMessage(`PDF saved as ${pdfFilename}.pdf`);
            setShowToast1(true);
          }
        }
      } else {
        // Desktop behavior - use original export function
        await exportHTMLAsPDF(htmlContent, {
          filename: pdfFilename,
          format: "a4",
          orientation: "portrait",
          margin: 10,
          quality: 2,
          onProgress: (message: string) => {
            setPdfProgress(message);
          },
        });

        setToastMessage(`PDF saved as ${pdfFilename}.pdf`);
        setShowToast1(true);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      setToastMessage("Failed to generate PDF. Please try again.");
      setShowToast1(true);
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress("");
    }
  };

  const doGenerateCSV = async (filename?: string) => {
    try {
      setIsGeneratingCSV(true);

      // Get CSV content from the spreadsheet using SocialCalc
      const csvContent = AppGeneral.getCSVContent();

      if (!csvContent || csvContent.trim() === "") {
        setToastMessage("No data available to export as CSV");
        setShowToast1(true);
        setIsGeneratingCSV(false);
        return;
      }

      const csvFilename = filename || selectedFile || "invoice_data";

      // Parse and clean the CSV content
      const cleanedCSV = parseSocialCalcCSV(csvContent);

      // Check if we're on a mobile device
      if (isPlatform("hybrid") || isPlatform("mobile")) {
        try {
          // Generate CSV as blob for sharing on mobile
          const csvBlob = await exportCSV(cleanedCSV, {
            filename: csvFilename,
            returnBlob: true,
          });

          if (csvBlob) {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              const base64 = base64Data.split(",")[1]; // Remove data prefix

              try {
                // Save to temporary file
                const tempFile = await Filesystem.writeFile({
                  path: `${csvFilename}.csv`,
                  data: base64,
                  directory: Directory.Cache,
                });

                // Share the file
                await Share.share({
                  title: `${csvFilename}.csv`,
                  text: "Invoice data exported as CSV",
                  url: tempFile.uri,
                  dialogTitle: "Share CSV",
                });

                setToastMessage(`CSV generated and ready to share!`);
                setShowToast1(true);
              } catch (shareError) {
                console.log("Error sharing CSV:", shareError);
                // Fallback: generate CSV normally
                await exportCSV(cleanedCSV, {
                  filename: csvFilename,
                });
                setToastMessage(`CSV saved as ${csvFilename}.csv`);
                setShowToast1(true);
              }
            };
            reader.readAsDataURL(csvBlob as Blob);
          }
        } catch (error) {
          console.error("Error processing CSV for sharing:", error);
          // Fallback to normal CSV generation
          await exportCSV(cleanedCSV, {
            filename: csvFilename,
          });
          setToastMessage(`CSV saved as ${csvFilename}.csv`);
          setShowToast1(true);
        }
      } else {
        // Desktop behavior - direct download
        await exportCSV(cleanedCSV, {
          filename: csvFilename,
        });

        setToastMessage(`CSV saved as ${csvFilename}.csv`);
        setShowToast1(true);
      }
    } catch (error) {
      console.error("Error generating CSV:", error);
      setToastMessage("Failed to generate CSV. Please try again.");
      setShowToast1(true);
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const doExportAllSheetsAsPDF = async (filename?: string) => {
    try {
      setIsExportingAllPDF(true);
      setExportAllProgress("Collecting all sheets data...");

      // Get all sheets data using the new function from index.js
      const sheetsData = AppGeneral.getAllSheetsData();

      if (!sheetsData || sheetsData.length === 0) {
        setToastMessage("No sheets available to export");
        setShowToast1(true);
        setIsExportingAllPDF(false);
        return;
      }

      const pdfFilename =
        filename || `${selectedFile}_all_sheets` || "all_invoices";

      setExportAllProgress(`Exporting ${sheetsData.length} sheets...`);

      // Check if we're on a mobile device
      if (isPlatform("hybrid") || isPlatform("mobile")) {
        // Generate PDF as blob for sharing on mobile
        const pdfBlob = await exportAllSheetsAsPDF(sheetsData, {
          filename: pdfFilename,
          format: "a4",
          orientation: "portrait",
          margin: 10,
          quality: 2,
          returnBlob: true,
          onProgress: (message: string) => {
            setExportAllProgress(message);
          },
        });

        if (pdfBlob) {
          try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              const base64 = base64Data.split(",")[1]; // Remove data:application/pdf;base64, prefix

              try {
                // Save to temporary file
                const tempFile = await Filesystem.writeFile({
                  path: `${pdfFilename}.pdf`,
                  data: base64,
                  directory: Directory.Cache,
                });

                // Share the file
                await Share.share({
                  title: `${pdfFilename}.pdf`,
                  text: `Combined PDF with ${sheetsData.length} invoices generated successfully`,
                  url: tempFile.uri,
                  dialogTitle: "Share Combined PDF",
                });

                setToastMessage(
                  `Combined PDF with ${sheetsData.length} sheets generated and ready to share!`
                );
                setShowToast1(true);
              } catch (shareError) {
                console.log("Error sharing combined PDF:", shareError);
                // Fallback: still generate PDF normally
                await exportAllSheetsAsPDF(sheetsData, {
                  filename: pdfFilename,
                  format: "a4",
                  orientation: "portrait",
                  margin: 10,
                  quality: 2,
                  onProgress: (message: string) => {
                    setExportAllProgress(message);
                  },
                });
                setToastMessage(`Combined PDF saved as ${pdfFilename}.pdf`);
                setShowToast1(true);
              }
            };
            reader.readAsDataURL(pdfBlob as Blob);
          } catch (error) {
            console.error("Error processing combined PDF for sharing:", error);
            // Fallback to normal PDF generation
            await exportAllSheetsAsPDF(sheetsData, {
              filename: pdfFilename,
              format: "a4",
              orientation: "portrait",
              margin: 10,
              quality: 2,
              onProgress: (message: string) => {
                setExportAllProgress(message);
              },
            });
            setToastMessage(`Combined PDF saved as ${pdfFilename}.pdf`);
            setShowToast1(true);
          }
        }
      } else {
        // Desktop behavior - use original export function
        await exportAllSheetsAsPDF(sheetsData, {
          filename: pdfFilename,
          format: "a4",
          orientation: "portrait",
          margin: 10,
          quality: 2,
          onProgress: (message: string) => {
            setExportAllProgress(message);
          },
        });

        setToastMessage(
          `Combined PDF with ${sheetsData.length} sheets saved as ${pdfFilename}.pdf`
        );
        setShowToast1(true);
      }
    } catch (error) {
      console.error("Error generating combined PDF:", error);
      setToastMessage("Failed to generate combined PDF. Please try again.");
      setShowToast1(true);
    } finally {
      setIsExportingAllPDF(false);
      setExportAllProgress("");
    }
  };

  const showPDFNameDialog = () => {
    setShowAlert6(true);
  };

  const showCSVNameDialog = () => {
    setShowAlert7(true);
  };

  const showExportAllPDFNameDialog = () => {
    setShowAlert8(true);
  };

  const doSaveAs = async (filename) => {
    // event.preventDefault();
    if (filename) {
      // console.log(filename, _validateName(filename));
      if (await _validateName(filename)) {
        // filename valid . go on save
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        // console.log(content);
        const now = new Date().toISOString();
        const file = new File(
          now,
          now,
          content,
          filename,
          billType,
          passwordProtect,
          passwordProtect ? filePassword : undefined
        );
        console.log(file);
        // const data = { created: file.created, modified: file.modified, content: file.content, password: file.password };
        // console.log(JSON.stringify(data));
        store._saveFile(file);
        updateSelectedFile(filename);

        // Reset password protection state
        setPasswordProtect(false);
        setFilePassword("");

        setShowAlert4(true);
      } else {
        setShowToast1(true);
      }
    }
  };

  const doSaveToServer = async (filename) => {
    if (filename) {
      if (await _validateName(filename)) {
        try {
          setToastMessage("Saving to server...");
          setShowToast1(true);

          const content = AppGeneral.getSpreadsheetContent();

          // Import the server files service
          const { cloudService } = await import(
            "../../services/cloud-service.js"
          );

          // Check if user is authenticated
          if (!cloudService.isAuthenticated()) {
            setToastMessage("Please login to server files first");
            setShowToast1(true);
            return;
          }

          // Upload to server
          const result = await cloudService.uploadInvoiceData(
            filename,
            content,
            billType
          );

          setToastMessage(`File saved to server as server_${filename}`);
          setShowToast1(true);
        } catch (error) {
          console.error("Error saving to server:", error);
          setToastMessage("Failed to save to server. Please try again.");
          setShowToast1(true);
        }
      } else {
        setShowToast1(true);
      }
    }
  };

  const doSaveAsWithPassword = async (filename, password) => {
    if (filename && password) {
      if (await _validateName(filename)) {
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        const now = new Date().toISOString();
        const file = new File(
          now,
          now,
          content,
          filename,
          billType,
          true,
          password
        );

        store._saveFile(file);
        updateSelectedFile(filename);
        setShowAlert4(true);
      } else {
        setShowToast1(true);
      }
    }
  };

  const sendEmail = () => {
    if (isPlatform("hybrid")) {
      const content = AppGeneral.getCurrentHTMLContent();
      const base64 = btoa(content);

      EmailComposer.open({
        to: ["jackdwell08@gmail.com"],
        cc: [],
        bcc: [],
        body: "PFA",
        attachments: [{ type: "base64", path: base64, name: "Invoice.html" }],
        subject: `${APP_NAME} attached`,
        isHtml: true,
      });
    } else {
      alert("This Functionality works on Anroid/IOS devices");
    }
  };

  // Function to generate invoice filename with current datetime
  const generateInvoiceFilename = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `invoice-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Function to select text in input field after dialog opens
  const selectInputText = (inputElement: HTMLIonInputElement) => {
    if (inputElement && inputElement.getInputElement) {
      inputElement.getInputElement().then((nativeInput) => {
        if (nativeInput) {
          nativeInput.select();
        }
      });
    }
  };
  const handleAddLogo = () => {
    console.log("Add Logo clicked");

    setShowLogoModal(true);
    fetchUserLogos();
  };

  const handleRemoveLogo = () => {
    console.log("Remove Logo clicked");

    try {
      // Get the correct logo coordinates based on device type
      const logoCoordinates = AppGeneral.getLogoCoordinates();
      console.log("Using logo coordinates for removal:", logoCoordinates);

      // Remove logo with proper coordinate object
      AppGeneral.removeLogo(logoCoordinates)
        .then(() => {
          console.log("Logo removed successfully");
          setToastMessage("Logo removed successfully!");
          setShowToast1(true);
        })
        .catch((error) => {
          console.error("Failed to remove logo:", error);
          setToastMessage("Failed to remove logo. Please try again.");
          setShowToast1(true);
        });
    } catch (error) {
      console.error("Error in handleRemoveLogo:", error);
      setToastMessage("Error removing logo. Please try again.");
      setShowToast1(true);
    }
  };

  // Logo modal functions
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
      setShowToast1(true);
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
        setShowToast1(true);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage("File size too large. Maximum 5MB allowed");
        setShowToast1(true);
        return;
      }

      setSelectedLogoFile(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) {
      setToastMessage("Please select a logo file");
      setShowToast1(true);
      return;
    }

    if (!cloudService.isAuthenticated()) {
      setToastMessage(
        "You're not logged in. Please login to use this feature."
      );
      setShowToast1(true);
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await cloudService.uploadLogo(selectedLogoFile);
      setToastMessage("Logo uploaded successfully!");
      setShowToast1(true);
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
      setShowToast1(true);
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
      setShowToast1(true);
      setShowLogoModal(false);
    } catch (error) {
      console.error("Failed to add logo:", error);
      setToastMessage("Failed to add logo. Please try again.");
      setShowToast1(true);
    }
  };

  const handleDeleteLogo = async (logoId: number) => {
    if (!cloudService.isAuthenticated()) {
      setToastMessage(
        "You're not logged in. Please login to use this feature."
      );
      setShowToast1(true);
      return;
    }

    try {
      await cloudService.deleteLogo(logoId);
      setToastMessage("Logo deleted successfully!");
      setShowToast1(true);
      // Refresh logos list
      await fetchUserLogos();
    } catch (error) {
      console.error("Failed to delete logo:", error);
      setToastMessage("Failed to delete logo. Please try again.");
      setShowToast1(true);
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

  // Create buttons array conditionally based on platform
  const getMenuButtons = () => {
    const baseButtons = [
      {
        text: "Save As",
        icon: save,
        handler: () => {
          setShowAlert3(true);
          console.log("Save As clicked");
        },
      },
      {
        text: "Save As (Password Protected)",
        icon: key,
        handler: () => {
          setShowAlert9(true);
          console.log("Save As with Password clicked");
        },
      },
    ];

    // Only add print button for non-mobile devices
    if (!isPlatform("mobile") && !isPlatform("hybrid")) {
      baseButtons.push({
        text: "Print",
        icon: print,
        handler: () => {
          doPrint();
          console.log("Print clicked");
        },
      });
    }

    // Add remaining buttons
    baseButtons.push(
      {
        text: "Export as PDF",
        icon: download,
        handler: () => {
          showPDFNameDialog();
          console.log("Download as PDF clicked");
        },
      },
      {
        text: "Export as CSV",
        icon: documentOutline,
        handler: () => {
          showCSVNameDialog();
          console.log("Export as CSV clicked");
        },
      },
      {
        text: "Export Workbook as PDF",
        icon: documents,
        handler: () => {
          showExportAllPDFNameDialog();
          console.log("Export All Sheets as PDF clicked");
        },
      },
      // {
      //   text: "Email",
      //   icon: mail,
      //   handler: () => {
      //     sendEmail();
      //     console.log("Email clicked");
      //   },
      // },
      {
        text: "Add Logo",
        icon: server,
        handler: () => {
          handleAddLogo();
        },
      },
      {
        text: "Remove Logo",
        icon: server,
        handler: () => {
          handleRemoveLogo();
        },
      },
      {
        text: "Save to Server",
        icon: server,
        handler: () => {
          setShowAlert11(true);
          console.log("Save to Server clicked");
        },
      }
    );

    return baseButtons;
  };

  return (
    <React.Fragment>
      <IonActionSheet
        animated
        keyboardClose
        isOpen={props.showM}
        onDidDismiss={() => props.setM()}
        buttons={getMenuButtons()}
      />
      <MenuDialogs
        // Alert states
        showAlert1={showAlert1}
        showAlert2={showAlert2}
        showAlert3={showAlert3}
        showAlert4={showAlert4}
        showAlert6={showAlert6}
        showAlert7={showAlert7}
        showAlert8={showAlert8}
        showAlert9={showAlert9}
        showAlert10={showAlert10}
        showAlert11={showAlert11}
        // Alert setters
        setShowAlert1={setShowAlert1}
        setShowAlert2={setShowAlert2}
        setShowAlert3={setShowAlert3}
        setShowAlert4={setShowAlert4}
        setShowAlert6={setShowAlert6}
        setShowAlert7={setShowAlert7}
        setShowAlert8={setShowAlert8}
        setShowAlert9={setShowAlert9}
        setShowAlert10={setShowAlert10}
        setShowAlert11={setShowAlert11}
        // Toast states
        showToast1={showToast1}
        setShowToast1={setShowToast1}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        // Loading states
        isGeneratingPDF={isGeneratingPDF}
        setIsGeneratingPDF={setIsGeneratingPDF}
        isGeneratingCSV={isGeneratingCSV}
        setIsGeneratingCSV={setIsGeneratingCSV}
        isExportingAllPDF={isExportingAllPDF}
        setIsExportingAllPDF={setIsExportingAllPDF}
        // Progress messages
        pdfProgress={pdfProgress}
        exportAllProgress={exportAllProgress}
        // Data for dialogs
        selectedFile={selectedFile}
        filePassword={filePassword}
        // Handlers
        doSaveAs={doSaveAs}
        doGeneratePDF={doGeneratePDF}
        doGenerateCSV={doGenerateCSV}
        doExportAllSheetsAsPDF={doExportAllSheetsAsPDF}
        doSaveAsWithPassword={doSaveAsWithPassword}
        doSaveToServer={doSaveToServer}
        generateInvoiceFilename={generateInvoiceFilename}
        selectInputText={selectInputText}
        // Alert control states
        showAlert11Open={showAlert11}
      />

      {/* Logo Modal */}
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
                  <IonItem>
                    <IonLabel position="stacked">Select Logo File</IonLabel>
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-file-input"
                      onChange={handleLogoFileChange}
                      style={{
                        margin: "10px 0",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        width: "100%",
                      }}
                    />
                  </IonItem>
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
    </React.Fragment>
  );
};

export default Menu;
