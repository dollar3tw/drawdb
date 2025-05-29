import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import SimpleCanvas from "../components/SimpleCanvas";
import Navbar from "../components/Navbar";
import { diagram } from "../data/heroDiagram";
import mysql_icon from "../assets/mysql.png";
import postgres_icon from "../assets/postgres.png";
import sqlite_icon from "../assets/sqlite.png";
import mariadb_icon from "../assets/mariadb.png";
import oraclesql_icon from "../assets/oraclesql.png";
import sql_server_icon from "../assets/sql-server.png";
import discord from "../assets/discord.png";
import github from "../assets/github.png";
import warp from "../assets/warp.png";
import screenshot from "../assets/screenshot.png";
import FadeIn from "../animations/FadeIn";
import axios from "axios";
import { getAllDiagramsAPI } from "../data/db"; // Fixed import path
import { languages } from "../i18n/i18n";
import { Tweet } from "react-tweet";
import { socials } from "../data/socials";

function shortenNumber(number) {
  if (number < 1000) return number;

  if (number >= 1000 && number < 1_000_000)
    return `${(number / 1000).toFixed(1)}k`;
}

export default function LandingPage() {
  const [stats, setStats] = useState({ stars: 18000, forks: 1200 });
  const [diagrams, setDiagrams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleDiagramClick = (diagramId) => {
    if (diagramId) {
      window.name = `d ${diagramId}`; // Set window.name to indicate which diagram to load
      navigate("/editor");          // Navigate to the editor page
    } else {
      console.error("Diagram ID is undefined. Cannot navigate.");
      // Optionally, show an error to the user via Toast or similar
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("https://api.github-star-counter.workers.dev/user/drawdb-io");
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching GitHub stats:", err);
        // Keep default stats or set to a specific error state if needed
      }
    };

    const fetchDiagrams = async () => {
      try {
        setIsLoading(true);
        const fetchedDiagrams = await getAllDiagramsAPI();
        setDiagrams(fetchedDiagrams || []); // Ensure diagrams is always an array
        setError(null); // Clear any previous error
      } catch (err) {
        console.error("Error fetching diagrams:", err);
        setError("Failed to load diagrams. Please try again later.");
        setDiagrams([]); // Clear diagrams on error
      } finally {
        setIsLoading(false);
      }
    };

    document.body.setAttribute("theme-mode", "light");
    document.title =
      "drawDB | Online database diagram editor and SQL generator";

    fetchStats();
    fetchDiagrams();
  }, []);

  return (
    <div>
      <div className="flex flex-col h-screen bg-zinc-100">
        <div className="text-white font-semibold py-1 text-sm text-center bg-linear-to-r from-[#12495e] from-10% via-slate-500 to-[#12495e]" />

        <FadeIn duration={0.6}>
          <Navbar />
        </FadeIn>

        {/* Hero section */}
        <div className="flex-1 flex-col relative mx-4 md:mx-0 mb-4 rounded-3xl bg-white">
          <div className="h-full md:hidden">
            <SimpleCanvas diagram={diagram} zoom={0.85} />
          </div>
          <div className="hidden md:block h-full bg-dots" />
          <div className="absolute left-12 w-[45%] top-[50%] translate-y-[-54%] md:left-[50%] md:translate-x-[-50%] p-8 md:p-3 md:w-full text-zinc-800">
            <FadeIn duration={0.75}>
              <h2 className="text-2xl mt-1 font-medium text-center mb-6">已儲存的圖表</h2>
              {isLoading && <p className="text-center">Loading diagrams...</p>}
              {error && <p className="text-center text-red-500">{error}</p>}
              {!isLoading && !error && diagrams.length === 0 && (
                <p className="text-center">No diagrams found. Create one using the editor!</p>
              )}
              {!isLoading && !error && diagrams.length > 0 && (
                <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg border border-zinc-200">
                  <ul className="divide-y divide-zinc-200">
                    {diagrams.map(diagram => (
                      <li 
                        key={diagram.id} 
                        className="px-6 py-4 hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleDiagramClick(diagram.id)}
                      >
                        <div className="font-semibold text-sky-700 text-lg">
                          {diagram.name || "Untitled Diagram"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last Modified: {new Date(diagram.lastModified).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </FadeIn>
            <div className="mt-4 font-semibold md:mt-12">
              <Link
                to="/editor"
                className="inline-block py-3 text-white transition-all duration-300 rounded-full shadow-lg bg-sky-900 ps-7 pe-6 hover:bg-sky-800"
              >
                新增圖表 <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Learn more */}
      <div id="learn-more">
      </div>

      {/* Contact us */}
      <div className="text-center text-sm py-3">
        &copy; 2024 <strong>drawDB</strong> - All right reserved.
      </div>
    </div>
  );
}

const dbs = [
  { icon: mysql_icon, height: 80 },
  { icon: postgres_icon, height: 48 },
  { icon: sqlite_icon, height: 64 },
  { icon: mariadb_icon, height: 64 },
  { icon: sql_server_icon, height: 64 },
  { icon: oraclesql_icon, height: 172 },
];

const features = [
  {
    title: "Export",
    content: (
      <div>
        Export the DDL script to run on your database or export the diagram as a
        JSON or an image.
      </div>
    ),
    footer: "",
  },
  {
    title: "Reverse engineer",
    content: (
      <div>
        Already have a schema? Import a DDL script to generate a diagram.
      </div>
    ),
    footer: "",
  },
  {
    title: "Customizable workspace",
    content: (
      <div>
        Customize the UI to fit your preferences. Select the components you want
        in your view.
      </div>
    ),
    footer: "",
  },
  {
    title: "Keyboard shortcuts",
    content: (
      <div>
        Speed up development with keyboard shortcuts. See all available
        shortcuts
        <Link
          to={`${socials.docs}/shortcuts`}
          className="ms-1.5 text-blue-500 hover:underline"
        >
          here
        </Link>
        .
      </div>
    ),
    footer: "",
  },
  {
    title: "Templates",
    content: (
      <div>
        Start off with pre-built templates. Get a quick start or get inspiration
        for your design.
      </div>
    ),
    footer: "",
  },
  {
    title: "Custom Templates",
    content: (
      <div>
        Have boilerplate structures? Save time by saving them as templates and
        load them when needed.
      </div>
    ),
    footer: "",
  },
  {
    title: "Robust editor",
    content: (
      <div>
        Undo, redo, copy, paste, duplicate and more. Add tables, subject areas,
        and notes.
      </div>
    ),
    footer: "",
  },
  {
    title: "Issue detection",
    content: (
      <div>
        Detect and tackle errors in the diagram to make sure the scripts are
        correct.
      </div>
    ),
    footer: "",
  },
  {
    title: "Relational databases",
    content: (
      <div>
        We support 5 relational databases - MySQL, PostgreSQL, SQLite, MariaDB,
        SQL Server.
      </div>
    ),
    footer: "",
  },
  {
    title: "Object-Relational databases",
    content: (
      <div>
        Add custom types for object-relational databases, or create custom JSON
        schemes.
      </div>
    ),
    footer: "",
  },
  {
    title: "Presentation mode",
    content: (
      <div>
        Present your diagrams on a big screen during team meetings and
        discussions.
      </div>
    ),
    footer: "",
  },
  {
    title: "Track todos",
    content: <div>Keep track of tasks and mark them done when finished.</div>,
    footer: "",
  },
];
