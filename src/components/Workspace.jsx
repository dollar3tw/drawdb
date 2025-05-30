import { useState, useEffect, useCallback, createContext } from "react";
import ControlPanel from "./EditorHeader/ControlPanel";
import Canvas from "./EditorCanvas/Canvas";
import { CanvasContextProvider } from "../context/CanvasContext";
import SidePanel from "./EditorSidePanel/SidePanel";
import { DB, State } from "../data/constants";
// import { db } from "../data/db"; // Dexie db removed
import {
  createDiagramAPI,
  getDiagramByIdAPI,
  updateDiagramAPI,
  getAllDiagramsAPI, // For loading latest or all
  // createTemplateAPI, // Assuming templates are saved if op === 't'
  getTemplateByIdAPI,
  updateTemplateAPI,
} from "../data/db";
import {
  useLayout,
  useSettings,
  useTransform,
  useDiagram,
  useUndoRedo,
  useAreas,
  useNotes,
  useTypes,
  useTasks,
  useSaveState,
  useEnums,
} from "../hooks";
import FloatingControls from "./FloatingControls";
import { Modal, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../data/databases";
import { isRtl } from "../i18n/utils/rtl";
import { useSearchParams } from "react-router-dom";
// Gist related import fully removed

// IdContext fully removed

const SIDEPANEL_MIN_WIDTH = 384;

export default function WorkSpace() {
  const [id, setId] = useState(0); // Will now store backend ID
  const [title, setTitle] = useState("Untitled Diagram");
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState(SIDEPANEL_MIN_WIDTH);
  const [lastSaved, setLastSaved] = useState("");
  const [showSelectDbModal, setShowSelectDbModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState("");
  const { layout } = useLayout();
  const { settings } = useSettings();
  const { types, setTypes } = useTypes();
  const { areas, setAreas } = useAreas();
  const { tasks, setTasks } = useTasks();
  const { notes, setNotes } = useNotes();
  const { saveState, setSaveState } = useSaveState();
  const { transform, setTransform } = useTransform();
  const { enums, setEnums } = useEnums();
  const {
    tables,
    relationships,
    setTables,
    setRelationships,
    database,
    setDatabase,
  } = useDiagram();
  const { undoStack, redoStack, setUndoStack, setRedoStack } = useUndoRedo();
  const { t, i18n } = useTranslation();
  let [searchParams, setSearchParams] = useSearchParams();
  const handleResize = (e) => {
    if (!resize) return;
    const w = isRtl(i18n.language) ? window.innerWidth - e.clientX : e.clientX;
    if (w > SIDEPANEL_MIN_WIDTH) setWidth(w);
  };

  const save = useCallback(async () => {
    if (saveState !== State.SAVING) return;

    const name = window.name.split(" ");
    const op = name[0];
    const saveAsDiagram = window.name === "" || op === "d" || op === "lt";

    // Construct common diagram data
    const diagramPayload = {
      databaseType: database, // Renamed from 'database' to 'databaseType' to match backend
      name: title,
      tables: tables,
      relationships: relationships, // Renamed from 'references'
      notes: notes,
      areas: areas,
      todos: tasks, // Add tasks to the payload
      pan: transform.pan,
      zoom: transform.zoom,
      ...(databases[database].hasEnums && { enums: enums }),
      ...(databases[database].hasTypes && { types: types }),
    };

    try {
      if (saveAsDiagram) {
        // searchParams.delete("shareId"); // Gist functionality removed
        // setSearchParams(searchParams); // Gist functionality removed
        if ((id === 0 && window.name === "") || op === "lt") { // Create new diagram
          const newDiagram = await createDiagramAPI(diagramPayload);
          setId(newDiagram.id);
          setTitle(newDiagram.name); // Backend might change the name slightly or confirm it
          setLastSaved(new Date(newDiagram.lastModified).toLocaleString());
          window.name = `d ${newDiagram.id}`;
          setSaveState(State.SAVED);
        } else { // Update existing diagram
          const updatedDiagram = await updateDiagramAPI(id, diagramPayload);
          // Backend returns the full updated diagram, could update other fields if necessary
          setLastSaved(new Date(updatedDiagram.lastModified).toLocaleString());
          setSaveState(State.SAVED);
        }
      } else { // Save as template (assuming 'op' corresponds to template operations)
        // Construct template data - similar to diagram but might have different fields e.g. 'subjectAreas'
        const templatePayload = {
          databaseType: database,
          title: title,
          tables: tables,
          relationships: relationships,
          notes: notes,
          subjectAreas: areas, // Field name for templates
          // todos: tasks, // 'todos' is not in backend schema for templates
          pan: transform.pan,
          zoom: transform.zoom,
          custom: 1, // Assuming custom templates are being saved
          ...(databases[database].hasEnums && { enums: enums }),
          ...(databases[database].hasTypes && { types: types }),
        };
        // Assuming 'id' here is the template ID for update operations
        await updateTemplateAPI(id, templatePayload);
        setSaveState(State.SAVED);
        setLastSaved(new Date().toLocaleString()); // updateTemplateAPI might not return lastModified
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setSaveState(State.ERROR);
    }
  }, [
    // searchParams, // Gist functionality removed
    // setSearchParams, // Gist functionality removed
    tables,
    relationships,
    notes,
    areas,
    types,
    title,
    id,
    tasks,
    transform,
    setSaveState,
    database,
    enums,
    saveState,
    // Added missing dependencies that are used in save
    database, tables, relationships, notes, areas, tasks, transform, enums, types, id, title, 
    setSaveState, setId, setTitle, setLastSaved // state setters
  ]);

  const load = useCallback(async () => {
    const loadLatestDiagram = async () => {
      try {
        const diagrams = await getAllDiagramsAPI();
        if (diagrams && diagrams.length > 0) {
          // Assuming diagrams are sorted by lastModified desc by API or sort here
          // For now, let's pick the first one if sorted, or find the one with max lastModified
          const d = diagrams.reduce((latest, current) => 
            new Date(latest.lastModified) > new Date(current.lastModified) ? latest : current
          );
          
          if (d.databaseType) { // Note: field is databaseType from backend
            setDatabase(d.databaseType);
          } else {
            setDatabase(DB.GENERIC);
          }
          setId(d.id);
          // setGistId(d.gistId); // Gist functionality removed
          // setLoadedFromGistId(d.loadedFromGistId); // Gist functionality removed
          setTitle(d.name);
          setTables(d.tables);
          setRelationships(d.relationships); // Note: field is relationships from backend
          setNotes(d.notes);
          setAreas(d.areas);
          setTasks(d.todos || []); // Load todos into tasks state
          setTransform({ pan: d.pan, zoom: d.zoom });
          if (databases[d.databaseType].hasTypes) { // Use d.databaseType
            setTypes(d.types ?? []);
          }
          if (databases[d.databaseType].hasEnums) { // Use d.databaseType
            setEnums(d.enums ?? []);
          }
          window.name = `d ${d.id}`;
        } else {
          window.name = "";
          if (selectedDb === "") setShowSelectDbModal(true);
        }
      } catch (error) {
        console.error("Error loading latest diagram:", error);
        setSaveState(State.FAILED_TO_LOAD); // Or a general load error state
        window.name = "";
        if (selectedDb === "") setShowSelectDbModal(true);
      }
    };

    const loadDiagram = async (diagramId) => {
      try {
        const diagram = await getDiagramByIdAPI(diagramId);
        if (diagram) {
          if (diagram.databaseType) { // Note: field is databaseType
            setDatabase(diagram.databaseType);
          } else {
            setDatabase(DB.GENERIC);
          }
          setId(diagram.id);
          // setGistId(diagram.gistId); // Gist functionality removed
          // setLoadedFromGistId(diagram.loadedFromGistId); // Gist functionality removed
          setTitle(diagram.name);
          setTables(diagram.tables);
          setRelationships(diagram.relationships); // Note: field is relationships
          setAreas(diagram.areas);
          setNotes(diagram.notes);
          setTasks(diagram.todos || []); // Load todos into tasks state
          setTransform({
            pan: diagram.pan,
            zoom: diagram.zoom,
          });
          setUndoStack([]);
          setRedoStack([]);
          if (databases[diagram.databaseType].hasTypes) { // Use diagram.databaseType
            setTypes(diagram.types ?? []);
          }
          if (databases[diagram.databaseType].hasEnums) { // Use diagram.databaseType
            setEnums(diagram.enums ?? []);
          }
          window.name = `d ${diagram.id}`;
        } else {
          window.name = ""; // Diagram not found
          setSaveState(State.FAILED_TO_LOAD); // Or specific error
          if (selectedDb === "") setShowSelectDbModal(true); // Fallback to select DB
        }
      } catch (error) {
        console.error(`Error loading diagram ${diagramId}:`, error);
        setSaveState(State.FAILED_TO_LOAD);
        window.name = "";
        if (selectedDb === "") setShowSelectDbModal(true);
      }
    };

    const loadTemplate = async (templateId) => {
      try {
        const template = await getTemplateByIdAPI(templateId);
        if (template) {
          if (template.databaseType) { // Note: field is databaseType
            setDatabase(template.databaseType);
          } else {
            setDatabase(DB.GENERIC);
          }
          setId(template.id); // This might be confusing; workspace 'id' usually for diagram
          setTitle(template.title);
          setTables(template.tables);
          setRelationships(template.relationships);
          setAreas(template.subjectAreas); // Field name for templates
          // setTasks(template.todos ?? []); // 'todos' not in backend schema
          setNotes(template.notes);
          setTransform({ // Reset transform for templates or use stored one
            zoom: template.zoom || 1,
            pan: template.pan || { x: 0, y: 0 },
          });
          setUndoStack([]);
          setRedoStack([]);
          if (databases[template.databaseType].hasTypes) { // Use template.databaseType
            setTypes(template.types ?? []);
          }
          if (databases[template.databaseType].hasEnums) { // Use template.databaseType
            setEnums(template.enums ?? []);
          }
          // window.name might need adjustment if loading a template means it's the "active" item
        } else {
          setSaveState(State.FAILED_TO_LOAD);
          if (selectedDb === "") setShowSelectDbModal(true);
        }
      } catch (error) {
        console.error(`Error loading template ${templateId}:`, error);
        setSaveState(State.FAILED_TO_LOAD);
        if (selectedDb === "") setShowSelectDbModal(true);
      }
    };

    // All Gist/shareId related logic removed from load function.
    // The console.warn and searchParams.delete are also removed.

    if (window.name === "") {
      await loadLatestDiagram();
    } else {
      const name = window.name.split(" ");
      const op = name[0];
      const id = parseInt(name[1]);
      switch (op) {
        case "d": {
          await loadDiagram(id);
          break;
        }
        case "t":
        case "lt": {
          await loadTemplate(id);
          break;
        }
        default:
          break;
      }
    }
  }, [
    setTransform,
    setRedoStack,
    setUndoStack,
    setRelationships,
    setTables,
    setAreas,
    setNotes,
    setTypes,
    setTasks,
    setDatabase,
    database,
    setEnums,
    selectedDb,
    setSaveState,
    setTransform,
    setRedoStack,
    setUndoStack,
    setRelationships,
    setTables,
    setAreas,
    setNotes,
    setTypes,
    setTasks, // Though 'todos' seems unused with backend schema
    setDatabase,
    // database, // 'database' is in the dependency array already via setDatabase if it's from useDiagram()
    setEnums,
    selectedDb,
    setSaveState,
    // searchParams and setSearchParams are no longer needed here as shareId logic is fully removed
    // Added missing state setters
    setId, setTitle 
  ]);

  useEffect(() => {
    if (
      tables?.length === 0 &&
      areas?.length === 0 &&
      notes?.length === 0 &&
      types?.length === 0 &&
      tasks?.length === 0
    )
      return;

    if (settings.autosave) {
      setSaveState(State.SAVING);
    }
  }, [
    undoStack,
    redoStack,
    settings.autosave,
    tables?.length,
    areas?.length,
    notes?.length,
    types?.length,
    relationships?.length,
  tasks?.length, // Add tasks length to dependencies
  transform.zoom, // Assuming zoom changes should trigger save
  transform.pan, // Assuming pan changes should trigger save
    title,
    setSaveState,
  // Added other relevant state that should trigger autosave if changed
  database, enums 
  ]);

  useEffect(() => {
    save();
  }, [saveState, save]);

  useEffect(() => {
    document.title = "Editor | drawDB";

    load();
  }, [load]); // 'load' dependency is correct

  return (
    <div className="h-full flex flex-col overflow-hidden theme">
        <ControlPanel
          diagramId={id} // This 'id' is now the backend diagram ID
          setDiagramId={setId} // This will set the backend diagram ID
          title={title}
          setTitle={setTitle}
          lastSaved={lastSaved}
          setLastSaved={setLastSaved}
        />
      {/* </IdContext.Provider> */}
      <div
        className="flex h-full overflow-y-auto"
        onPointerUp={(e) => e.isPrimary && setResize(false)}
        onPointerLeave={(e) => e.isPrimary && setResize(false)}
        onPointerMove={(e) => e.isPrimary && handleResize(e)}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
        style={isRtl(i18n.language) ? { direction: "rtl" } : {}}
      >
        {layout.sidebar && (
          <SidePanel resize={resize} setResize={setResize} width={width} />
        )}
        <div className="relative w-full h-full overflow-hidden">
          <CanvasContextProvider className="h-full w-full">
            <Canvas saveState={saveState} setSaveState={setSaveState} />
          </CanvasContextProvider>
          {!(layout.sidebar || layout.toolbar || layout.header) && (
            <div className="fixed right-5 bottom-4">
              <FloatingControls />
            </div>
          )}
        </div>
      </div>
      <Modal
        centered
        size="medium"
        closable={false}
        hasCancel={false}
        title={t("pick_db")}
        okText={t("confirm")}
        visible={showSelectDbModal}
        onOk={() => {
          if (selectedDb === "") return;
          setDatabase(selectedDb);
          setShowSelectDbModal(false);
        }}
        okButtonProps={{ disabled: selectedDb === "" }}
      >
        <div className="grid grid-cols-3 gap-4 place-content-center">
          {Object.values(databases).map((x) => (
            <div
              key={x.name}
              onClick={() => setSelectedDb(x.label)}
              className={`space-y-3 p-3 rounded-md border-2 select-none ${
                settings.mode === "dark"
                  ? "bg-zinc-700 hover:bg-zinc-600"
                  : "bg-zinc-100 hover:bg-zinc-200"
              } ${selectedDb === x.label ? "border-zinc-400" : "border-transparent"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{x.name}</div>
                {x.beta && (
                  <Tag size="small" color="light-blue">
                    Beta
                  </Tag>
                )}
              </div>
              {x.image && (
                <img
                  src={x.image}
                  className="h-8"
                  style={{
                    filter:
                      "opacity(0.4) drop-shadow(0 0 0 white) drop-shadow(0 0 0 white)",
                  }}
                />
              )}
              <div className="text-xs">{x.description}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
