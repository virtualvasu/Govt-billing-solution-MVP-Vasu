import React, { useState, useEffect } from "react";
import "./Files.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { File as LocalFile, Local } from "../Storage/LocalStorage";
import {
  IonIcon,
  IonItem,
  IonList,
  IonLabel,
  IonAlert,
  IonItemGroup,
  IonBadge,
  IonSpinner,
  IonToast,
  IonSegment,
  IonSegmentButton,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonPage,
  IonSearchbar,
  IonButton,
  IonInput,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonModal,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  trash,
  key,
  documentText,
  cloudOutline,
  server,
  logIn,
  personAdd,
  download,
  folderOpen,
  cloudUpload,
  close,
  swapVertical,
  create,
} from "ionicons/icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useHistory } from "react-router-dom";
import { cloudService, ServerFile } from "../../services/cloud-service";
import { useInvoice } from "../../contexts/InvoiceContext";
import { cleanServerFilename, formatDateForFilename } from "../../utils/helper";

const Files: React.FC<{
  store: Local;
  file: string;
  updateSelectedFile: Function;
  updateBillType: Function;
}> = (props) => {
  const { selectedFile, updateSelectedFile } = useInvoice();
  const { isDarkMode } = useTheme();
  const history = useHistory();

  const [showAlert1, setShowAlert1] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [showServerDeleteAlert, setShowServerDeleteAlert] = useState(false);
  const [currentServerFile, setCurrentServerFile] = useState<ServerFile | null>(
    null
  );
  const [device] = useState(AppGeneral.getDeviceType());

  const [showRenameAlert, setShowRenameAlert] = useState(false);
  const [renameFileName, setRenameFileName] = useState("");
  const [currentRenameKey, setCurrentRenameKey] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [fileSource, setFileSource] = useState<"local" | "server">("local");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "date" | "dateCreated" | "dateModified"
  >("dateModified");
  const [fileListContent, setFileListContent] = useState<React.ReactNode>(null);

  // Server files state
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [serverFilesLoading, setServerFilesLoading] = useState(false);

  const [deletingFile, setDeletingFile] = useState<number | null>(null);
  const [isSavingAllToServer, setIsSavingAllToServer] = useState(false);
  const [saveAllProgress, setSaveAllProgress] = useState("");
  const [saveAllCount, setSaveAllCount] = useState({ current: 0, total: 0 });
  const [isMovingAllToLocal, setIsMovingAllToLocal] = useState(false);
  const [moveAllProgress, setMoveAllProgress] = useState("");
  const [moveAllCount, setMoveAllCount] = useState({ current: 0, total: 0 });

  const handleSaveUnsavedChanges = async () => {
    // Save Default File Changes if not already saved
    if (selectedFile === "default" && key !== "default") {
      try {
        const defaultExists = await props.store._checkKey("default");
        if (defaultExists) {
          const storedDefaultFile = await props.store._getFile("default");

          // Decode the stored content
          const storedContent = decodeURIComponent(storedDefaultFile.content);
          const msc = DATA["home"][device]["msc"];

          const hasUnsavedChanges = storedContent !== JSON.stringify(msc);
          if (hasUnsavedChanges) {
            console.log("Default file has unsaved changes, saving...");
            // Save the current spreadsheet content to the default file
            const currentContent = AppGeneral.getSpreadsheetContent();
            const now = new Date().toISOString();

            const untitledFileName =
              "Untitled-" + formatDateForFilename(new Date());
            const updatedDefaultFile = new LocalFile(
              now, // created
              now, // modified
              encodeURIComponent(currentContent), // encoded content
              untitledFileName, // new name for the default file
              storedDefaultFile.billType, // keep the same billType
              false // isEncrypted = false for default files
            );
            await props.store._saveFile(updatedDefaultFile);

            // Clear Default File...
            const templateContent = encodeURIComponent(JSON.stringify(msc));
            const newDefaultFile = new LocalFile(
              now,
              now,
              templateContent,
              "default",
              1
            );
            await props.store._saveFile(newDefaultFile);
            setToastMessage(`Changes Saved as ${untitledFileName}`);
            setShowToast(true);
          }
        }
      } catch (error) {
        console.error("Error saving default file changes:", error);
        setToastMessage("Failed to save default file changes");
        setShowToast(true);
      }
    }
  };
  // Edit local file
  const editFile = async (key: string) => {
    try {
      console.log("Attempting to edit file:", key);

      await handleSaveUnsavedChanges();

      const data = await props.store._getFile(key);
      console.log("File data retrieved:", {
        name: data.name,
        contentLength: data.content?.length,
        billType: data.billType,
        hasContent: !!data.content,
      });

      if (!data.content) {
        setToastMessage("File content is empty or corrupted");
        setShowToast(true);
        return;
      }

      const decodedContent = decodeURIComponent(data.content);
      console.log("Decoded content length:", decodedContent.length);
      console.log("Decoded content preview:", decodedContent.substring(0, 200));

      // Ensure SocialCalc is properly initialized before loading the file
      // First, try to get the current workbook control to see if it's initialized
      try {
        const currentControl = AppGeneral.getWorkbookInfo();
        console.log("Current workbook info:", currentControl);

        if (currentControl && currentControl.workbook) {
          // SocialCalc is initialized, use viewFile
          AppGeneral.viewFile(key, decodedContent);
          console.log("File loaded successfully with viewFile");
        } else {
          // SocialCalc not initialized, initialize it first
          console.log("SocialCalc not initialized, initializing...");
          AppGeneral.initializeApp(decodedContent);
          console.log("File loaded successfully with initializeApp");
        }
      } catch (error) {
        console.error("Error checking SocialCalc state:", error);
        // Fallback: try to initialize the app
        try {
          AppGeneral.initializeApp(decodedContent);
          console.log("File loaded successfully with initializeApp (fallback)");
        } catch (initError) {
          console.error("initializeApp failed:", initError);
          throw new Error(
            "Failed to load file: SocialCalc initialization error"
          );
        }
      }

      props.updateSelectedFile(key);
      props.updateBillType(data.billType);
      history.push("/home");
    } catch (error) {
      console.error("Error in editFile:", error);
      setToastMessage("Failed to load file");
      setShowToast(true);
    }
  };

  // Delete file
  const deleteFile = (key: string) => {
    setShowAlert1(true);
    setCurrentKey(key);
  };

  // Delete server file (with confirmation)
  const deleteServerFile = (file: ServerFile) => {
    setShowServerDeleteAlert(true);
    setCurrentServerFile(file);
  };

  // Load default file
  const loadDefault = () => {
    const msc = DATA["home"][AppGeneral.getDeviceType()]["msc"];
    AppGeneral.viewFile("default", JSON.stringify(msc));
    props.updateSelectedFile("default");
  };

  // Format date with validation
  const _formatDate = (date: string) => {
    if (!date) return "Unknown date";
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }
    return parsedDate.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get appropriate date label and value based on sort option for local files
  const getLocalFileDateInfo = (file: any) => {
    const parseDate = (dateValue: any) => {
      if (!dateValue) return null;

      // If it's already a valid date string (ISO format)
      if (
        typeof dateValue === "string" &&
        !isNaN(new Date(dateValue).getTime())
      ) {
        return dateValue;
      }

      // If it's a Date.toString() format, parse it
      if (typeof dateValue === "string" && dateValue.includes("GMT")) {
        const parsed = new Date(dateValue);
        return !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
      }

      return null;
    };

    if (sortBy === "dateCreated") {
      const createdDate =
        parseDate(file.dateCreated) ||
        parseDate(file.date) ||
        parseDate(file.dateModified);
      return {
        label: "Created",
        value: createdDate || new Date().toISOString(),
      };
    } else if (sortBy === "dateModified") {
      const modifiedDate = parseDate(file.dateModified) || parseDate(file.date);
      return {
        label: "Modified",
        value: modifiedDate || new Date().toISOString(),
      };
    } else {
      const modifiedDate = parseDate(file.date) || parseDate(file.dateModified);
      return {
        label: "Modified",
        value: modifiedDate || new Date().toISOString(),
      };
    }
  };

  // Sort files based on selected criteria
  const sortFiles = (
    files: any[],
    sortCriteria: "name" | "date" | "dateCreated" | "dateModified"
  ) => {
    const sortedFiles = [...files];

    switch (sortCriteria) {
      case "name":
        return sortedFiles.sort((a, b) => {
          const nameA = (a.name || a.filename || "").toLowerCase();
          const nameB = (b.name || b.filename || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case "date":
        return sortedFiles.sort((a, b) => {
          const dateA = new Date(a.date || a.created_at || 0).getTime();
          const dateB = new Date(b.date || b.created_at || 0).getTime();
          return dateB - dateA; // Most recent first
        });
      case "dateCreated":
        return sortedFiles.sort((a, b) => {
          const dateA = new Date(
            a.dateCreated || a.date || a.dateModified || 0
          ).getTime();
          const dateB = new Date(
            b.dateCreated || b.date || b.dateModified || 0
          ).getTime();
          // Handle invalid dates by treating them as very old dates (0)
          const validDateA = isNaN(dateA) ? 0 : dateA;
          const validDateB = isNaN(dateB) ? 0 : dateB;
          return validDateB - validDateA; // Most recent first
        });
      case "dateModified":
        return sortedFiles.sort((a, b) => {
          const dateA = new Date(a.dateModified || a.date || 0).getTime();
          const dateB = new Date(b.dateModified || b.date || 0).getTime();
          // Handle invalid dates by treating them as very old dates (0)
          const validDateA = isNaN(dateA) ? 0 : dateA;
          const validDateB = isNaN(dateB) ? 0 : dateB;
          return validDateB - validDateA; // Most recent first
        });
      default:
        return sortedFiles;
    }
  };

  // Group files by date
  const groupFilesByDate = (
    files: any[],
    sortCriteria?: "name" | "date" | "dateCreated" | "dateModified"
  ) => {
    const groups: { [key: string]: any[] } = {};
    files.forEach((file) => {
      let dateForGrouping;

      if (sortCriteria === "dateCreated") {
        const createdDate = file.dateCreated || file.date || file.dateModified;
        dateForGrouping = new Date(createdDate);
        // Fallback to a valid date if the created date is invalid
        if (isNaN(dateForGrouping.getTime())) {
          dateForGrouping = new Date(
            file.dateModified || file.date || Date.now()
          );
        }
      } else if (sortCriteria === "dateModified") {
        const modifiedDate = file.dateModified || file.date;
        dateForGrouping = new Date(modifiedDate);
        // Fallback to a valid date if the modified date is invalid
        if (isNaN(dateForGrouping.getTime())) {
          dateForGrouping = new Date(file.date || Date.now());
        }
      } else {
        dateForGrouping = new Date(file.date || file.created_at);
        // Fallback to current date if invalid
        if (isNaN(dateForGrouping.getTime())) {
          dateForGrouping = new Date();
        }
      }

      const dateHeader = dateForGrouping.toDateString();
      if (!groups[dateHeader]) groups[dateHeader] = [];
      groups[dateHeader].push(file);
    });
    return groups;
  };

  // Filter files by search
  const filterFilesBySearch = (files: any[], query: string) => {
    if (!query.trim()) return files;
    const searchTerm = query.toLowerCase().trim();
    return files.filter((file) => {
      const fileName =
        file.name?.toLowerCase() ||
        file.file_name?.toLowerCase() ||
        file.key?.toLowerCase() ||
        file.filename?.toLowerCase() ||
        "";
      return fileName.includes(searchTerm);
    });
  };

  // Server files functions
  const loadServerFiles = async () => {
    if (!cloudService.isAuthenticated()) return;

    setServerFilesLoading(true);
    try {
      const files = await cloudService.getFiles();
      setServerFiles(files);
    } catch (error) {
      setToastMessage("Failed to load server files");
      setShowToast(true);
    } finally {
      setServerFilesLoading(false);
    }
  };

  const handleFileDownload = async (file: ServerFile) => {
    try {
      const blob = await cloudService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToastMessage("File downloaded successfully");
      setShowToast(true);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Download failed"
      );
      setShowToast(true);
    }
  };

  const handleFileDelete = async (fileId: number) => {
    setDeletingFile(fileId);
    try {
      await cloudService.deleteFile(fileId);
      setToastMessage("File deleted successfully");
      setShowToast(true);
      loadServerFiles();
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Delete failed");
      setShowToast(true);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleMoveToLocal = async (file: ServerFile) => {
    try {
      setToastMessage("Moving file to local storage...");
      setShowToast(true);

      // Download the file from server
      const blob = await cloudService.downloadFile(file.id);

      // Convert blob to text
      const text = await blob.text();

      // Parse the JSON content
      const fileData = JSON.parse(text);
      console.log("Server file data:", fileData);

      // Check if this is a server invoice file (has the expected structure)
      if (
        fileData.content &&
        fileData.fileName &&
        fileData.billType !== undefined
      ) {
        // The content from server is already the raw content, not URL-encoded
        // We need to URL-encode it for local storage
        const encodedContent = encodeURIComponent(fileData.content);

        // Remove the "server_" prefix from the filename
        const localFileName = fileData.fileName.replace("server_", "");

        console.log("Creating local file with:", {
          fileName: localFileName,
          contentLength: fileData.content.length,
          encodedContentLength: encodedContent.length,
          billType: fileData.billType,
        });

        // Validate the filename (basic check)
        if (!localFileName || localFileName.trim() === "") {
          setToastMessage("Invalid filename. Cannot move to local storage.");
          setShowToast(true);
          return;
        }

        // Check if file already exists locally
        const fileExists = await props.store._checkKey(localFileName);
        if (fileExists) {
          setToastMessage(
            `File "${localFileName}" already exists in local storage.`
          );
          setShowToast(true);
          return;
        }

        // Create a local file
        const now = new Date().toISOString();
        const localFile = new LocalFile(
          now,
          now,
          encodedContent, // Use URL-encoded content
          localFileName, // Use filename without server_ prefix
          fileData.billType,
          false // isEncrypted = false for server files
        );

        console.log("Local file created:", {
          name: localFile.name,
          contentLength: localFile.content.length,
          billType: localFile.billType,
          created: localFile.created,
          modified: localFile.modified,
        });

        // Save to local storage
        await props.store._saveFile(localFile);
        console.log("File saved to local storage successfully");

        // Verify the file was saved correctly
        const savedData = await props.store._getFile(localFileName);
        console.log("Verification - saved file data:", {
          name: savedData.name,
          contentLength: savedData.content?.length,
          billType: savedData.billType,
          hasContent: !!savedData.content,
        });

        setToastMessage(`File moved to local storage as ${localFile.name}`);
        setShowToast(true);

        // Refresh the file list
        await renderFileList();
      } else {
        console.error("Invalid file structure:", fileData);
        setToastMessage("Invalid file format. Cannot move to local storage.");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error moving file to local storage:", error);
      setToastMessage("Failed to move file to local storage");
      setShowToast(true);
    }
  };

  // Save all local files to server
  const handleSaveAllToServer = async () => {
    if (!cloudService.isAuthenticated()) {
      setToastMessage("Please login to save files to server");
      setShowToast(true);
      return;
    }

    try {
      setIsSavingAllToServer(true);
      setSaveAllProgress("Preparing to save all files...");

      // Get all local files and exclude the default file
      const localFiles = await props.store._getAllFiles();
      const filesArray = Object.keys(localFiles).filter(
        (key) => key !== "default"
      );

      if (filesArray.length === 0) {
        setToastMessage("No local files to save");
        setShowToast(true);
        return;
      }

      setSaveAllCount({ current: 0, total: filesArray.length });
      setSaveAllProgress(`Saving 0 of ${filesArray.length} files...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < filesArray.length; i++) {
        const fileName = filesArray[i];
        setSaveAllCount({ current: i + 1, total: filesArray.length });
        setSaveAllProgress(
          `Saving ${i + 1} of ${filesArray.length} files: ${fileName}`
        );

        try {
          // Get file data
          const fileData = await props.store._getFile(fileName);
          if (!fileData || !fileData.content) {
            errors.push(`${fileName} (empty or corrupted)`);
            errorCount++;
            continue;
          }

          let contentToUpload: string;

          // Check if this is the currently selected/active file
          // If so, get the live content from the spreadsheet instead of stored content
          if (selectedFile === fileName) {
            try {
              // Get current live content from the spreadsheet (like Menu.tsx does)
              contentToUpload = AppGeneral.getSpreadsheetContent();
              console.log(`Using live content for active file: ${fileName}`);
            } catch (error) {
              console.log(
                `Failed to get live content for ${fileName}, using stored content`
              );
              // Fallback to stored content if getting live content fails
              contentToUpload = decodeURIComponent(fileData.content);
            }
          } else {
            // For non-active files, use the stored content (decode it first)
            contentToUpload = decodeURIComponent(fileData.content);
          }

          // Upload to server using the existing service
          await cloudService.uploadInvoiceData(
            fileName,
            contentToUpload,
            fileData.billType || 0
          );

          successCount++;
          console.log(`Successfully saved ${fileName} to server`);
        } catch (error) {
          errorCount++;
          errors.push(
            `${fileName} (${
              error instanceof Error ? error.message : "unknown error"
            })`
          );
          console.error(`Error saving ${fileName} to server:`, error);
        }

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Show completion message
      let message = `Save complete: ${successCount} files saved successfully`;
      if (errorCount > 0) {
        message += `, ${errorCount} failed`;
        if (errors.length <= 3) {
          message += `\nFailed files: ${errors.join(", ")}`;
        } else {
          message += `\nFirst 3 failed files: ${errors
            .slice(0, 3)
            .join(", ")}... and ${errors.length - 3} more`;
        }
      }

      setToastMessage(message);
      setShowToast(true);

      // Refresh server files if we're viewing them
      if (fileSource === "server") {
        await loadServerFiles();
      }
    } catch (error) {
      console.error("Error in save all to server:", error);
      setToastMessage("Failed to save files to server");
      setShowToast(true);
    } finally {
      setIsSavingAllToServer(false);
      setSaveAllProgress("");
      setSaveAllCount({ current: 0, total: 0 });
    }
  };

  // Move all server files to local storage
  const handleMoveAllToLocal = async () => {
    if (!cloudService.isAuthenticated()) {
      setToastMessage("Please login to access server files");
      setShowToast(true);
      return;
    }

    try {
      setIsMovingAllToLocal(true);
      setMoveAllProgress("Preparing to move all files...");

      // Get all server files - filter only invoice files (those starting with "server_")
      const invoiceFiles = serverFiles.filter((file) =>
        file.filename.startsWith("server_")
      );

      if (invoiceFiles.length === 0) {
        setToastMessage("No invoice files found on server to move");
        setShowToast(true);
        return;
      }

      setMoveAllCount({ current: 0, total: invoiceFiles.length });
      setMoveAllProgress(`Moving 0 of ${invoiceFiles.length} files...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < invoiceFiles.length; i++) {
        const file = invoiceFiles[i];
        setMoveAllCount({ current: i + 1, total: invoiceFiles.length });
        setMoveAllProgress(
          `Moving ${i + 1} of ${invoiceFiles.length} files: ${file.filename}`
        );

        try {
          // Download the file from server
          const blob = await cloudService.downloadFile(file.id);
          const text = await blob.text();
          const fileData = JSON.parse(text);

          // Check if this is a valid server invoice file
          if (
            fileData.content &&
            fileData.fileName &&
            fileData.billType !== undefined
          ) {
            // Remove the "server_" prefix from the filename
            const localFileName = fileData.fileName.replace("server_", "");

            // Validate the filename
            if (!localFileName || localFileName.trim() === "") {
              errors.push(`${file.filename} (invalid filename)`);
              errorCount++;
              continue;
            }

            // Check if file already exists locally
            const fileExists = await props.store._checkKey(localFileName);
            if (fileExists) {
              errors.push(`${localFileName} (already exists locally)`);
              errorCount++;
              continue;
            }

            // The content from server is raw content, encode it for local storage
            const encodedContent = encodeURIComponent(fileData.content);

            // Create a local file
            const now = new Date().toISOString();
            const localFile = new LocalFile(
              now,
              now,
              encodedContent,
              localFileName,
              fileData.billType,
              false // isEncrypted = false for server files
            );

            // Save to local storage
            await props.store._saveFile(localFile);
            successCount++;
            console.log(
              `Successfully moved ${file.filename} to local storage as ${localFileName}`
            );
          } else {
            errors.push(`${file.filename} (invalid file format)`);
            errorCount++;
            continue;
          }
        } catch (error) {
          errorCount++;
          errors.push(
            `${file.filename} (${
              error instanceof Error ? error.message : "unknown error"
            })`
          );
          console.error(
            `Error moving ${file.filename} to local storage:`,
            error
          );
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Show completion message
      let message = `Move complete: ${successCount} files moved successfully`;
      if (errorCount > 0) {
        message += `, ${errorCount} failed`;
        if (errors.length <= 3) {
          message += `\nFailed files: ${errors.join(", ")}`;
        } else {
          message += `\nFirst 3 failed files: ${errors
            .slice(0, 3)
            .join(", ")}... and ${errors.length - 3} more`;
        }
      }

      setToastMessage(message);
      setShowToast(true);

      // Refresh the file list to show the new local files
      await renderFileList();
    } catch (error) {
      console.error("Error in move all to local:", error);
      setToastMessage("Failed to move files to local storage");
      setShowToast(true);
    } finally {
      setIsMovingAllToLocal(false);
      setMoveAllProgress("");
      setMoveAllCount({ current: 0, total: 0 });
    }
  };

  // Validation function (adapted from Menu.tsx)
  const _validateName = async (filename: string, excludeKey?: string) => {
    filename = filename.trim();
    if (filename === "default" || filename === "Untitled") {
      setToastMessage(
        "Cannot update default or Untitled file! Use Save As Button to save."
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
    } else if (
      (await props.store._checkKey(filename)) &&
      filename !== excludeKey
    ) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };

  // Rename file function
  const renameFile = (key: string) => {
    setCurrentRenameKey(key);
    setRenameFileName(key);
    setShowRenameAlert(true);
  };

  // Handle rename confirmation
  const handleRename = async (newFileName: string) => {
    if (!currentRenameKey) return;

    // If the new filename is the same as the current one, just close the dialog
    if (newFileName === currentRenameKey) {
      setToastMessage("File name unchanged");
      setShowToast(true);
      setCurrentRenameKey(null);
      setRenameFileName("");
      setShowRenameAlert(false);
      return;
    }

    if (await _validateName(newFileName, currentRenameKey)) {
      try {
        // Get the existing file data
        const fileData = await props.store._getFile(currentRenameKey);

        // Create a new file with the new name
        const renamedFile = new LocalFile(
          fileData.created, // Keep the original creation date
          new Date().toISOString(), // Use ISO string for modified date
          fileData.content,
          newFileName,
          fileData.billType,
          fileData.isPasswordProtected,
          fileData.password
        );

        // Save the new file
        await props.store._saveFile(renamedFile);

        // Delete the old file
        await props.store._deleteFile(currentRenameKey);

        // Update selected file if it was the renamed file
        if (selectedFile === currentRenameKey) {
          updateSelectedFile(newFileName);
        }

        setToastMessage(`File renamed to "${newFileName}"`);
        setShowToast(true);

        // Refresh the file list
        await renderFileList();

        // Reset state
        setCurrentRenameKey(null);
        setRenameFileName("");
        setShowRenameAlert(false);
      } catch (error) {
        console.error("Error renaming file:", error);
        setToastMessage("Failed to rename file");
        setShowToast(true);
        // Reset state even on error to close the dialog
        setCurrentRenameKey(null);
        setRenameFileName("");
        setShowRenameAlert(false);
      }
    } else {
      // Validation failed - show the error toast but keep the dialog open
      // The validation function already shows the error toast
      setShowToast(true);
      // Don't close the dialog here - let the user see the error and try again
    }
  };

  // Render file list
  const renderFileList = async () => {
    let content;
    if (fileSource === "local") {
      const localFiles = await props.store._getAllFiles();

      const filesArray = Object.keys(localFiles)
        .filter((key) => key !== "default") // Exclude the default file from the list
        .map((key) => {
          const fileData = localFiles[key];

          // Ensure dates are properly converted - handle both ISO strings and Date.toString() formats
          let createdDate = fileData.created;
          let modifiedDate = fileData.modified;

          // If the date looks like a Date.toString() format, try to parse it
          // Date.toString() typically looks like "Mon Jul 06 2025 10:30:00 GMT+0000 (UTC)"
          if (typeof createdDate === "string" && createdDate.includes("GMT")) {
            createdDate = new Date(createdDate).toISOString();
          }
          if (
            typeof modifiedDate === "string" &&
            modifiedDate.includes("GMT")
          ) {
            modifiedDate = new Date(modifiedDate).toISOString();
          }

          return {
            key,
            name: key,
            date: modifiedDate, // For backward compatibility
            dateCreated: createdDate,
            dateModified: modifiedDate,
            type: "local",
          };
        });
      const filteredFiles = filterFilesBySearch(filesArray, searchQuery);
      if (filteredFiles.length === 0) {
        content = (
          <IonList style={{ border: "none" }} lines="none">
            <IonItem style={{ "--border-width": "0px" }}>
              <IonLabel>
                {searchQuery.trim()
                  ? `No files found matching "${searchQuery}"`
                  : "No local files found"}
              </IonLabel>
            </IonItem>
          </IonList>
        );
      } else {
        const sortedFiles = sortFiles(filteredFiles, sortBy);

        if (sortBy === "name") {
          // For name sorting, show files in a simple list without date grouping
          content = (
            <IonList style={{ border: "none" }} lines="none">
              {sortedFiles.map((file) => (
                <IonItemGroup key={`local-${file.key}`}>
                  <IonItem
                    className="mobile-file-item"
                    onClick={() => editFile(file.key)}
                    style={{
                      "--border-width": "0px",
                      cursor: "pointer",
                    }}
                  >
                    <IonIcon
                      icon={documentText}
                      slot="start"
                      className="file-icon document-icon"
                    />
                    <IonLabel className="mobile-file-label">
                      <h3>{file.name}</h3>
                      <p>
                        Local file • {getLocalFileDateInfo(file).label}:{" "}
                        {_formatDate(getLocalFileDateInfo(file).value)}
                      </p>
                    </IonLabel>
                    <div
                      slot="end"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <IonIcon
                        icon={create}
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          renameFile(file.key);
                        }}
                        style={{
                          fontSize: "24px",
                          cursor: "pointer",
                        }}
                      />
                      <IonIcon
                        icon={trash}
                        color="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.key);
                        }}
                        style={{
                          fontSize: "24px",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  </IonItem>
                </IonItemGroup>
              ))}
            </IonList>
          );
        } else {
          // For date and recent sorting, group by date
          const groupedFiles = groupFilesByDate(sortedFiles, sortBy);
          content = (
            <IonList style={{ border: "none" }} lines="none">
              {Object.entries(groupedFiles).map(([dateHeader, files]) => (
                <div key={`local-group-${dateHeader}`}>
                  <IonItem
                    color="light"
                    className="date-header-item"
                    style={{ "--border-width": "0px" }}
                  >
                    <IonLabel>
                      <h2
                        className="date-header-text"
                        style={{ color: "var(--ion-color-primary)" }}
                      >
                        {dateHeader}
                      </h2>
                    </IonLabel>
                  </IonItem>
                  {(files as any[]).map((file) => (
                    <IonItemGroup key={`local-${file.key}`}>
                      {" "}
                      <IonItem
                        className="mobile-file-item"
                        onClick={() => editFile(file.key)}
                        style={{
                          "--border-width": "0px",
                          cursor: "pointer",
                        }}
                      >
                        <IonIcon
                          icon={documentText}
                          slot="start"
                          className="file-icon document-icon"
                        />
                        <IonLabel className="mobile-file-label">
                          <h3>{file.name}</h3>
                          <p>
                            Local file • {getLocalFileDateInfo(file).label}:{" "}
                            {_formatDate(getLocalFileDateInfo(file).value)}
                          </p>
                        </IonLabel>
                        <div
                          slot="end"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <IonIcon
                            icon={create}
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              renameFile(file.key);
                            }}
                            style={{
                              fontSize: "24px",
                              cursor: "pointer",
                            }}
                          />
                          <IonIcon
                            icon={trash}
                            color="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.key);
                            }}
                            style={{
                              fontSize: "24px",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      </IonItem>
                    </IonItemGroup>
                  ))}
                </div>
              ))}
            </IonList>
          );
        }
      }
    } else if (fileSource === "server") {
      if (!cloudService.isAuthenticated()) {
        content = (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Server Files</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Please login to access your server files.</p>
            </IonCardContent>
          </IonCard>
        );
      } else {
        if (serverFilesLoading) {
          content = (
            <IonList style={{ border: "none" }} lines="none">
              <IonItem style={{ "--border-width": "0px" }}>
                <IonSpinner name="circular" slot="start" />
                <IonLabel>Loading server files...</IonLabel>
              </IonItem>
            </IonList>
          );
        } else if (serverFiles.length === 0) {
          content = (
            <IonList style={{ border: "none" }} lines="none">
              <IonItem style={{ "--border-width": "0px" }}>
                <IonLabel>
                  {searchQuery.trim()
                    ? `No files found matching "${searchQuery}"`
                    : "No server files found"}
                </IonLabel>
              </IonItem>
            </IonList>
          );
        } else {
          const filteredFiles = filterFilesBySearch(serverFiles, searchQuery);
          if (filteredFiles.length === 0) {
            content = (
              <IonList style={{ border: "none" }} lines="none">
                <IonItem style={{ "--border-width": "0px" }}>
                  <IonLabel>
                    {searchQuery.trim()
                      ? `No files found matching "${searchQuery}"`
                      : "No server files found"}
                  </IonLabel>
                </IonItem>
              </IonList>
            );
          } else {
            const mappedFiles = filteredFiles.map((file) => ({
              ...file,
              date: file.created_at,
              name: file.filename,
            }));
            const sortedFiles = sortFiles(mappedFiles, sortBy);

            if (sortBy === "name") {
              // For name sorting, show files in a simple list without date grouping
              content = (
                <IonList style={{ border: "none" }} lines="none">
                  {sortedFiles.map((file) => {
                    const isDeleting = deletingFile === file.id;
                    return (
                      <IonItemGroup key={`server-${file.id}`}>
                        <IonItem
                          className="mobile-file-item"
                          style={{
                            "--border-width": "0px",
                            cursor: "pointer",
                          }}
                        >
                          <IonIcon
                            icon={server}
                            slot="start"
                            className="file-icon server-icon"
                          />
                          <IonLabel className="mobile-file-label">
                            <h3>
                              {file.filename.startsWith("server_")
                                ? cleanServerFilename(file.filename)
                                : file.filename}
                            </h3>
                            <p>Server file • {_formatDate(file.created_at)}</p>
                            <p>
                              Size: {(file.file_size / 1024).toFixed(2)} KB
                              {file.filename.startsWith("server_")}
                            </p>
                          </IonLabel>
                          <div
                            slot="end"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {file.filename.startsWith("server_") && (
                              <IonIcon
                                icon={download}
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToLocal(file);
                                }}
                                title="Move to Local Storage"
                                style={{
                                  fontSize: "24px",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                            <IonIcon
                              icon={trash}
                              color="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteServerFile(file);
                              }}
                              style={{
                                fontSize: "24px",
                                cursor: "pointer",
                                opacity: isDeleting ? 0.5 : 1,
                              }}
                            />
                            {isDeleting && <IonSpinner name="circular" />}
                          </div>
                        </IonItem>
                      </IonItemGroup>
                    );
                  })}
                </IonList>
              );
            } else {
              // For date and recent sorting, group by date
              const groupedFiles = groupFilesByDate(sortedFiles, sortBy);
              content = (
                <IonList style={{ border: "none" }} lines="none">
                  {Object.entries(groupedFiles).map(([dateHeader, files]) => (
                    <div key={`server-group-${dateHeader}`}>
                      <IonItem
                        color="light"
                        className="date-header-item"
                        style={{ "--border-width": "0px" }}
                      >
                        <IonLabel>
                          <h2
                            className="date-header-text"
                            style={{ color: "var(--ion-color-primary)" }}
                          >
                            {dateHeader}
                          </h2>
                        </IonLabel>
                      </IonItem>
                      {(files as any[]).map((file) => {
                        const isDeleting = deletingFile === file.id;
                        return (
                          <IonItemGroup key={`server-${file.id}`}>
                            <IonItem
                              className="mobile-file-item"
                              style={{
                                "--border-width": "0px",
                                cursor: "pointer",
                              }}
                            >
                              <IonIcon
                                icon={server}
                                slot="start"
                                className="file-icon server-icon"
                              />
                              <IonLabel className="mobile-file-label">
                                <h3>
                                  {file.filename.startsWith("server_")
                                    ? cleanServerFilename(file.filename)
                                    : file.filename}
                                </h3>
                                <p>
                                  Server file • {_formatDate(file.created_at)}
                                </p>
                                <p>
                                  Size: {(file.file_size / 1024).toFixed(2)} KB
                                  {file.filename.startsWith("server_")}
                                </p>
                              </IonLabel>
                              <div
                                slot="end"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {file.filename.startsWith("server_") && (
                                  <IonIcon
                                    icon={download}
                                    color="success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToLocal(file);
                                    }}
                                    title="Move to Local Storage"
                                    style={{
                                      fontSize: "24px",
                                      cursor: "pointer",
                                    }}
                                  />
                                )}
                                <IonIcon
                                  icon={trash}
                                  color="danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteServerFile(file);
                                  }}
                                  style={{
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    opacity: isDeleting ? 0.5 : 1,
                                  }}
                                />
                                {isDeleting && <IonSpinner name="circular" />}
                              </div>
                            </IonItem>
                          </IonItemGroup>
                        );
                      })}
                    </div>
                  ))}
                </IonList>
              );
            }
          }
        }
      }
    }
    setFileListContent(content);
  };

  useEffect(() => {
    renderFileList();
    // eslint-disable-next-line
  }, [
    props.file,
    fileSource,
    searchQuery,
    sortBy,
    serverFiles,
    serverFilesLoading,
  ]);

  useEffect(() => {
    if (fileSource === "server" && cloudService.isAuthenticated()) {
      loadServerFiles();
    }
  }, [fileSource]);

  // Reset sort option when switching file sources to ensure compatibility
  useEffect(() => {
    if (fileSource === "server") {
      // For server files, only "date" and "name" are available
      if (sortBy === "dateCreated" || sortBy === "dateModified") {
        setSortBy("date");
      }
    } else {
      // For local files, if coming from server and using "date", switch to "dateModified"
      if (sortBy === "date") {
        setSortBy("dateModified");
      }
    }
  }, [fileSource]);

  return (
      <div style={{
        paddingBottom: "60px",
      }}>
      <div >
        <div className="files-modal-content">
         

          {/* File Source Tabs */}
          <div className="custom-tabs-container">
            <div className="custom-tabs">
              <button
                className={`custom-tab-button ${fileSource === "local" ? "active" : ""}`}
                onClick={() => setFileSource("local")}
              >
                🏠 Local Files
              </button>
              <button
                className={`custom-tab-button ${fileSource === "server" ? "active" : ""}`}
                onClick={() => setFileSource("server")}
              >
                ☁️ Server Files
              </button>
            </div>
          </div>
          <div style={{ padding: "0 16px 16px 16px" }}>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <IonSearchbar
                placeholder="Search files by name..."
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value!)}
                onIonClear={() => setSearchQuery("")}
                showClearButton="focus"
                debounce={300}
                style={{ flex: "2", minWidth: "200px" }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: "1",
                  minWidth: "140px",
                  maxWidth: "180px",
                }}
              >
                <IonIcon
                  icon={swapVertical}
                  style={{ marginRight: "4px", fontSize: "16px" }}
                />
                <IonSelect
                  value={sortBy}
                  placeholder="Sort by"
                  onIonChange={(e) => setSortBy(e.detail.value)}
                  style={{
                    flex: "1",
                    "--placeholder-color": "var(--ion-color-medium)",
                    "--color": "var(--ion-color-dark)",
                  }}
                  interface="popover"
                >
                  {fileSource === "local" ? (
                    <>
                      <IonSelectOption value="dateModified">
                        By Date Modified
                      </IonSelectOption>
                      <IonSelectOption value="dateCreated">
                        By Date Created
                      </IonSelectOption>
                      <IonSelectOption value="name">By Name</IonSelectOption>
                    </>
                  ) : (
                    <>
                      <IonSelectOption value="date">By Date</IonSelectOption>
                      <IonSelectOption value="name">By Name</IonSelectOption>
                    </>
                  )}
                </IonSelect>
              </div>
            </div>
          </div>
          {fileSource === "local" && cloudService.isAuthenticated() && (
            <div
              style={{
                padding: "0 16px 8px 16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <IonButton
                size="small"
                fill="solid"
                color="primary"
                onClick={handleSaveAllToServer}
                disabled={isSavingAllToServer}
              >
                <IonIcon icon={cloudUpload} slot="start" />
                {isSavingAllToServer ? "Saving..." : "Save All to Server"}
              </IonButton>
              {isSavingAllToServer && (
                <div
                  style={{ fontSize: "12px", color: "var(--ion-color-medium)" }}
                >
                  {saveAllProgress}
                  {saveAllCount.total > 0 && (
                    <span>
                      {" "}
                      ({saveAllCount.current}/{saveAllCount.total})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {fileSource === "local" && !cloudService.isAuthenticated() && (
            <div
              style={{
                padding: "0 16px 8px 16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <IonButton size="small" fill="outline" color="medium" disabled>
                <IonIcon icon={cloudUpload} slot="start" />
                Save All to Server (Login Required)
              </IonButton>
            </div>
          )}
          {fileSource === "server" && cloudService.isAuthenticated() && (
            <div
              style={{
                padding: "0 16px 8px 16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <IonButton
                size="small"
                fill="solid"
                color="secondary"
                onClick={handleMoveAllToLocal}
                disabled={isMovingAllToLocal}
              >
                <IonIcon icon={download} slot="start" />
                {isMovingAllToLocal ? "Moving..." : "Move All to Local"}
              </IonButton>
              {isMovingAllToLocal && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--ion-color-medium)",
                    width: "100%",
                    marginTop: "4px",
                  }}
                >
                  {moveAllProgress}
                  {moveAllCount.total > 0 && (
                    <span>
                      {" "}
                      ({moveAllCount.current}/{moveAllCount.total})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div
          className="files-scrollable-container"
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "0 16px",
          }}
        >
          {fileListContent}
        </div>
      </div>

      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Delete file"
        message={"Do you want to delete the " + currentKey + " file?"}
        buttons={[
          { text: "No", role: "cancel" },
          {
            text: "Yes",
            handler: async () => {
              if (currentKey) {
                await props.store._deleteFile(currentKey);
                loadDefault();
                setCurrentKey(null);
                await renderFileList();
              }
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showServerDeleteAlert}
        onDidDismiss={() => setShowServerDeleteAlert(false)}
        header="Delete server file"
        message={
          currentServerFile
            ? `Do you want to delete the "${
                currentServerFile.filename.startsWith("server_")
                  ? cleanServerFilename(currentServerFile.filename)
                  : currentServerFile.filename
              }" file from the server?`
            : "Do you want to delete this file from the server?"
        }
        buttons={[
          { text: "No", role: "cancel" },
          {
            text: "Yes",
            handler: async () => {
              if (currentServerFile) {
                await handleFileDelete(currentServerFile.id);
                setCurrentServerFile(null);
              }
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showRenameAlert}
        onDidDismiss={() => {
          setShowRenameAlert(false);
          setCurrentRenameKey(null);
          setRenameFileName("");
        }}
        header="Rename File"
        message={`Enter a new name for "${currentRenameKey}"`}
        inputs={[
          {
            name: "filename",
            type: "text",
            value: renameFileName,
            placeholder: "Enter new filename",
          },
        ]}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setCurrentRenameKey(null);
              setRenameFileName("");
            },
          },
          {
            text: "Rename",
            handler: (data) => {
              const newFileName = data.filename?.trim();
              if (newFileName) {
                handleRename(newFileName);
              } else {
                setToastMessage("Filename cannot be empty");
                setShowToast(true);
              }
            },
          },
        ]}
      />
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="top"
      />
  </div>
  );
};

export default Files;
