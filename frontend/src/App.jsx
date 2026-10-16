
import { useEffect, useState } from "react";
import { getHealth, getAgents, createTask } from "./api.js";

// Frontend demo agents. Backend integration will happen later.
const demoAgents = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    category: "DATA & RESEARCH",
    description:
      "Analyze datasets, identify trends, and turn raw data into useful insights.",
    price: "0.05",
    icon: "▥",
    color: "green",
    rating: "4.9",
  },
  {
    id: "content-writer",
    name: "Content Writer",
    category: "CONTENT",
    description:
      "Draft engaging articles, blog posts, product descriptions, and copy.",
    price: "0.03",
    icon: "✳",
    color: "purple",
    rating: "4.8",
  },
  {
    id: "code-assistant",
    name: "Code Assistant",
    category: "DEVELOPMENT",
    description:
      "Review source code, explain errors, and suggest improvements.",
    price: "0.08",
    icon: "</>",
    color: "blue",
    rating: "4.9",
  },
  {
    id: "research-analyst",
    name: "Research Analyst",
    category: "RESEARCH",
    description:
      "Organize research questions, summarize supplied material, and create reports.",
    price: "0.06",
    icon: "⌕",
    color: "purple",
    rating: "4.7",
  },
  {
    id: "marketing-strategist",
    name: "Marketing Strategist",
    category: "MARKETING",
    description:
      "Develop campaign ideas, audience profiles, and marketing plans.",
    price: "0.04",
    icon: "✳",
    color: "green",
    rating: "4.8",
  },
  {
    id: "workflow-automator",
    name: "Workflow Automator",
    category: "AUTOMATION",
    description:
      "Plan repeatable workflows and identify opportunities to automate tasks.",
    price: "0.07",
    icon: "ϟ",
    color: "blue",
    rating: "4.7",
  },
  {
    id: "support-assistant",
    name: "Support Assistant",
    category: "CUSTOMER SUPPORT",
    description:
      "Draft helpful support replies and organize common customer questions.",
    price: "0.03",
    icon: "☏",
    color: "green",
    rating: "4.8",
  },
  {
    id: "ui-ux-designer",
    name: "UI/UX Designer",
    category: "DESIGN",
    description:
      "Suggest page layouts, user flows, and practical interface improvements.",
    price: "0.06",
    icon: "◇",
    color: "purple",
    rating: "4.9",
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    category: "MARKETING",
    description:
      "Suggest keywords, page titles, content structure, and SEO improvements.",
    price: "0.04",
    icon: "↗",
    color: "blue",
    rating: "4.6",
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant",
    category: "SALES",
    description:
      "Draft outreach messages, prepare sales talking points, and organize leads.",
    price: "0.05",
    icon: "↗",
    color: "green",
    rating: "4.7",
  },
  {
    id: "finance-analyst",
    name: "Finance Analyst",
    category: "FINANCE",
    description:
      "Help organize financial data, compare figures, and prepare summaries.",
    price: "0.09",
    icon: "₹",
    color: "purple",
    rating: "4.8",
  },
  {
    id: "translator",
    name: "Translator",
    category: "LANGUAGE",
    description:
      "Translate supplied text and help adapt writing for different audiences.",
    price: "0.03",
    icon: "文",
    color: "blue",
    rating: "4.7",
  },
];

function normalizeAgents(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.agents)
      ? payload.agents
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.agents)
          ? payload.data.agents
          : null;

  if (!list) {
    throw new Error(
      "Unexpected /api/agents response. Expected an array of agents."
    );
  }

  const colors = ["green", "purple", "blue"];

  return list.map((item, index) => {
    const ratingValue = item.rating ?? item.score ?? null;
    const priceValue = item.price ?? item.pricePerTask ?? item.budget ?? null;

    return {
      id: String(item.id ?? item.agentId ?? item.slug ?? `agent-${index + 1}`),
      name: String(item.name ?? item.title ?? `Agent ${index + 1}`),
      category: String(item.category ?? item.type ?? "AI AGENT").toUpperCase(),
      description: String(
        item.description ?? item.summary ?? "No description provided."
      ),
      price:
        priceValue !== null && priceValue !== ""
          ? String(priceValue)
          : null,
      icon: String(item.icon ?? "✳"),
      color: colors[index % colors.length],
      rating:
        ratingValue !== null && ratingValue !== ""
          ? String(ratingValue)
          : null,
    };
  });
}

const TASKS_STORAGE_KEY = "agentpay_prepared_tasks_v1";

// Load saved demo tasks safely from this browser.
function readSavedTasks() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.agent === "string" &&
        typeof item.task === "string"
    );
  } catch {
    return [];
  }
}

const navItems = [
  { name: "Overview", icon: "◫" },
  { name: "Marketplace", icon: "▦" },
  { name: "Run a task", icon: "ϟ" },
  { name: "Transactions", icon: "⇄" },
];

function App() {
  const [activePage, setActivePage] = useState("Home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [sortBy, setSortBy] = useState("recommended");
  const [historySearch, setHistorySearch] = useState("");

  const [agents, setAgents] = useState(demoAgents);
  const [agentsSource, setAgentsSource] = useState("demo");
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskNotice, setTaskNotice] = useState("");

  const [selectedAgent, setSelectedAgent] = useState(
    demoAgents[0].id
  );
  const [task, setTask] = useState("");
  const [budget, setBudget] = useState("0.05");

  // Prepared demo tasks persist across page refreshes in this browser.
  const [preparedTasks, setPreparedTasks] = useState(() => readSavedTasks());
  const [activeTaskId, setActiveTaskId] = useState(() => {
    const savedTasks = readSavedTasks();
    return savedTasks[0]?.id ?? null;
  });
  const [taskError, setTaskError] = useState("");
  const [storageStatus, setStorageStatus] = useState("checking");

  // Save task history whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify(preparedTasks)
      );
      setStorageStatus("saved");
    } catch {
      setStorageStatus("unavailable");
    }
  }, [preparedTasks]);

  // Connect to the backend on startup. If unavailable, retain demo agents.
  useEffect(() => {
    let active = true;

    async function checkBackend() {
      try {
        await getHealth();
        if (active) setBackendStatus("connected");
      } catch {
        if (active) setBackendStatus("offline");
      }
    }

    async function loadAgentDirectory() {
      setAgentsLoading(true);
      setAgentsError("");

      try {
        const payload = await getAgents();
        const liveAgents = normalizeAgents(payload);

        if (!active) return;

        if (liveAgents.length === 0) {
          setAgents(demoAgents);
          setAgentsSource("demo");
          setAgentsError("The backend returned no agents. Showing the demo catalogue.");
          return;
        }

        setAgents(liveAgents);
        setAgentsSource("live");
        setSelectedAgent((currentId) =>
          liveAgents.some((agent) => agent.id === currentId)
            ? currentId
            : liveAgents[0].id
        );
      } catch (error) {
        if (!active) return;
        setAgents(demoAgents);
        setAgentsSource("demo");
        setAgentsError(
          error instanceof Error
            ? error.message
            : "Unable to load agents from the backend."
        );
      } finally {
        if (active) setAgentsLoading(false);
      }
    }

    checkBackend();
    loadAgentDirectory();

    return () => {
      active = false;
    };
  }, []);

  const categories = [
    "All categories",
    ...Array.from(new Set(agents.map((agent) => agent.category))).sort(),
  ];

  const latestTask = preparedTasks.find(
    (item) => item.id === activeTaskId
  ) ?? null;
  const recentTasks = preparedTasks.slice(0, 3);
  const categoryCount = categories.length - 1;

  const selectedAgentDetails = agents.find(
    (agent) => agent.id === selectedAgent
  );

  // Search, filter, and sort the local demo agent list.
  const filteredAgents = agents
    .filter((agent) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        [agent.id, agent.name, agent.category, agent.description].some(
          (value) => String(value ?? "").toLowerCase().includes(query)
        );
      const matchesCategory =
        selectedCategory === "All categories" ||
        agent.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "budget-low") {
        return Number(a.price) - Number(b.price);
      }
      if (sortBy === "budget-high") {
        return Number(b.price) - Number(a.price);
      }
      if (sortBy === "rating") {
        return Number(b.rating ?? 0) - Number(a.rating ?? 0);
      }
      return agents.indexOf(a) - agents.indexOf(b);
    });

  function resetMarketplaceFilters() {
    setSearch("");
    setSelectedCategory("All categories");
    setSortBy("recommended");
  }

  // Search saved task history. These are prepared demo tasks, not payments.
  const filteredHistoryTasks = preparedTasks.filter((item) => {
    const query = historySearch.toLowerCase().trim();
    if (!query) return true;

    return [item.id, item.agent, item.task, item.status, item.createdAt].some(
      (value) => String(value ?? "").toLowerCase().includes(query)
    );
  });

  const proposedBudgetTotal = preparedTasks.reduce((total, item) => {
    const amount = Number(item.budget);
    return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);

  // Open the task page for the chosen agent.
  function chooseAgent(agent) {
    setSelectedAgent(agent.id);
    setBudget(agent.price ?? "0.05");
    setTaskError("");
    setActivePage("Run a task");
  }

  // Update task instructions and clear old validation errors.
  function handleTaskChange(event) {
    setTask(event.target.value);

    if (taskError) {
      setTaskError("");
    }
  }

  // Submit a task to the backend when available; otherwise prepare a clearly labelled local demo.
  async function handleTaskSubmit(event) {
    event.preventDefault();
    setTaskError("");
    setTaskNotice("");

    const cleanTask = task.trim();
    const numericBudget = Number(budget);

    if (!selectedAgentDetails) {
      setTaskError("Please select an agent.");
      return;
    }

    if (!cleanTask) {
      setTaskError("Please enter your task instructions.");
      return;
    }

    if (cleanTask.length < 10) {
      setTaskError(
        "Please provide at least 10 characters describing your task."
      );
      return;
    }

    const centsValue = numericBudget * 100;
    const hasMoreThanTwoDecimals =
      Number.isFinite(centsValue) &&
      Math.abs(centsValue - Math.round(centsValue)) > 1e-7;

    if (
      budget.trim() === "" ||
      !Number.isFinite(numericBudget) ||
      numericBudget < 0.01 ||
      hasMoreThanTwoDecimals
    ) {
      setTaskError(
        "Enter a valid budget of at least $0.01, using no more than 2 decimal places."
      );
      return;
    }

    setTaskSubmitting(true);

    try {
      let preparedTask;

      if (backendStatus === "connected") {
        // The backend should validate this payload and keep AI/payment secrets server-side.
        const response = await createTask({
          agentId: selectedAgentDetails.id,
          task: cleanTask,
          maxBudget: numericBudget.toFixed(2),
        });

        const responseAgent =
          typeof response?.agent === "string"
            ? response.agent
            : response?.agent?.name ?? selectedAgentDetails.name;

        const rawResult = response?.result;
        const resultText =
          typeof rawResult === "string"
            ? rawResult
            : rawResult && typeof rawResult === "object"
              ? JSON.stringify(rawResult, null, 2)
              : "The backend accepted the task but did not return a result field.";

        preparedTask = {
          id: String(
            response?.requestId ??
              response?.taskId ??
              response?.id ??
              `API-${Date.now()}`
          ),
          agentId: selectedAgentDetails.id,
          agent: responseAgent,
          task: cleanTask,
          budget: numericBudget.toFixed(2),
          status: String(response?.status ?? "Submitted"),
          createdAt: new Date().toLocaleString(),
          result: resultText,
          executionMode: "backend",
          paymentStatus: "Not verified by frontend",
        };

        setTaskNotice(
          "The backend accepted the task. Check its returned status and result below; payment verification is separate."
        );
      } else {
        preparedTask = {
          id: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          agentId: selectedAgentDetails.id,
          agent: selectedAgentDetails.name,
          task: cleanTask,
          budget: numericBudget.toFixed(2),
          status: "Prepared locally",
          createdAt: new Date().toLocaleString(),
          result:
            "This task was saved locally because the backend is unavailable. No AI agent executed the task and no payment occurred.",
          executionMode: "local-demo",
          paymentStatus: "No payment",
        };

        setTaskNotice(
          "Backend unavailable: this was saved as a local demo task only. Start the backend to submit real tasks."
        );
      }

      setPreparedTasks((currentTasks) => [
        preparedTask,
        ...currentTasks.filter((item) => item.id !== preparedTask.id),
      ]);
      setActiveTaskId(preparedTask.id);
    } catch (error) {
      setTaskError(
        error instanceof Error
          ? `Backend task submission failed: ${error.message}`
          : "Backend task submission failed. Please try again."
      );
    } finally {
      setTaskSubmitting(false);
    }
  }

  function openSavedTask(taskRecord) {
    setActiveTaskId(taskRecord.id);
    setTask(taskRecord.task || "");
    setBudget(String(taskRecord.budget ?? "0.05"));

    if (agents.some((agent) => agent.id === taskRecord.agentId)) {
      setSelectedAgent(taskRecord.agentId);
    }

    setTaskError("");
    setActivePage("Run a task");
  }

  function openPage(page) {
    setActivePage(page);
    setTaskError("");
  }

  // Home is the premium public landing page; Overview and the other items open the full workspace.
  return activePage === "Home" ? (
    <LandingPage
      agents={agents}
      agentsSource={agentsSource}
      backendStatus={backendStatus}
      onNavigate={openPage}
    />
  ) : (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar" id="workspace-sidebar">
        <button
          className="brand sidebar-brand"
          onClick={() => openPage("Home")}
          aria-label="Go to AgentPay home"
        >
          <span className="brand-icon">A</span>
          <span>
            Agent<span className="brand-accent">Pay</span>
          </span>
        </button>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => openPage(item.name)}
              aria-current={
                activePage === item.name ? "page" : undefined
              }
              title={item.name}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {item.name === "Marketplace" && (
                <span className="nav-count">
                  {agents.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <span className={`status-dot ${backendStatus}`} />

            <div>
              <strong>
                {backendStatus === "checking"
                  ? "Checking backend..."
                  : backendStatus === "connected"
                    ? "Backend connected"
                    : "Demo environment"}
              </strong>
              <span>
                {backendStatus === "checking"
                  ? "Checking localhost:4000"
                  : backendStatus === "connected"
                    ? `Health check passed · ${agentsSource === "live" ? "live agent data" : "demo agent fallback"}`
                    : "Backend unavailable · local demo mode"}
              </span>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">AP</div>

            <div className="profile-info">
              <strong>AgentPay Builder</strong>
              <span>Frontend workspace</span>
            </div>

            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="workspace-sidebar"
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">{sidebarCollapsed ? "☰" : "‹"}</span>
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="environment-badge">
              <span className={`status-dot ${backendStatus}`} />
              {backendStatus === "checking"
                ? "Checking backend"
                : backendStatus === "connected"
                  ? "Backend connected"
                  : "Demo mode"}
            </span>

            <div className="topbar-avatar">AP</div>
          </div>
        </header>

        <div className="page-container">
          {/* Overview */}
          {activePage === "Overview" && (
            <>
              <section className="welcome-section">
                <div>
                  <p className="eyebrow">
                    YOUR AGENT ECONOMY
                  </p>

                  <h1>
                    Command your <span>agents.</span>
                  </h1>

                  <p className="section-description">
                    Discover autonomous agents, prepare tasks,
                    and manage your workspace from one place.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => openPage("Marketplace")}
                >
                  Explore marketplace <span>↗</span>
                </button>
              </section>

              <section className="stats-grid">
                <StatCard
                  label="Available agents"
                  value={String(agents.length).padStart(2, "0")}
                  detail={`${categoryCount} ${agentsSource === "live" ? "API categories" : "demo categories"}`}
                  icon="▦"
                />

                <StatCard
                  label="Tasks prepared"
                  value={String(preparedTasks.length).padStart(2, "0")}
                  detail="Saved in this browser"
                  icon="ϟ"
                />

                <StatCard
                  label="Proposed budget"
                  value={`$${proposedBudgetTotal.toFixed(2)}`}
                  detail="Not actual spending"
                  icon="$"
                />
              </section>

              <section className="quick-actions-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">QUICK ACTIONS</p>
                    <h2>Move your work forward</h2>
                  </div>
                </div>

                <div className="quick-actions-grid">
                  <button
                    className="quick-action-card"
                    type="button"
                    onClick={() => openPage("Run a task")}
                  >
                    <span className="quick-action-icon">ϟ</span>
                    <span className="quick-action-copy">
                      <strong>Prepare a task</strong>
                      <small>Choose an agent and describe the work</small>
                    </span>
                    <span className="quick-action-arrow">↗</span>
                  </button>

                  <button
                    className="quick-action-card"
                    type="button"
                    onClick={() => openPage("Marketplace")}
                  >
                    <span className="quick-action-icon">▦</span>
                    <span className="quick-action-copy">
                      <strong>Explore agents</strong>
                      <small>Browse {agents.length} {agentsSource === "live" ? "live" : "demo"} agents</small>
                    </span>
                    <span className="quick-action-arrow">↗</span>
                  </button>

                  <button
                    className="quick-action-card"
                    type="button"
                    onClick={() => openPage("Transactions")}
                  >
                    <span className="quick-action-icon">↺</span>
                    <span className="quick-action-copy">
                      <strong>Task history</strong>
                      <small>Review your saved task records</small>
                    </span>
                    <span className="quick-action-arrow">↗</span>
                  </button>
                </div>
              </section>

              <section className="overview-status-grid" aria-label="Workspace status">
                <article className="overview-status-card">
                  <span className="overview-status-symbol">▤</span>
                  <div className="overview-status-copy">
                    <span className="overview-status-label">TASK HISTORY</span>
                    <strong>
                      {storageStatus === "saved"
                        ? "Saved locally"
                        : storageStatus === "unavailable"
                          ? "Storage unavailable"
                          : "Checking storage"}
                    </strong>
                    <small>{preparedTasks.length} prepared task records</small>
                  </div>
                </article>

                <article className="overview-status-card">
                  <span className="overview-status-symbol purple">✳</span>
                  <div className="overview-status-copy">
                    <span className="overview-status-label">AI EXECUTION</span>
                    <strong>{backendStatus === "connected" ? "Backend reachable" : "Not connected"}</strong>
                    <small>{backendStatus === "connected" ? "Task endpoint still validates each request" : "Tasks are local demos only"}</small>
                  </div>
                </article>

                <article className="overview-status-card">
                  <span className="overview-status-symbol blue">⇄</span>
                  <div className="overview-status-copy">
                    <span className="overview-status-label">PAYMENTS</span>
                    <strong>Not connected</strong>
                    <small>No blockchain payments have occurred</small>
                  </div>
                </article>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">DISCOVER</p>
                    <h2>Featured agents</h2>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => openPage("Marketplace")}
                  >
                    View all agents <span>→</span>
                  </button>
                </div>

                <div className="agent-grid">
                  {agents.slice(0, 3).map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onChoose={chooseAgent}
                    />
                  ))}
                </div>
              </section>

              <section className="section-block activity-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">YOUR WORK</p>
                    <h2>Recent activity</h2>
                  </div>

                  <button
                    className="text-button"
                    type="button"
                    onClick={() => openPage("Transactions")}
                  >
                    View task history <span>→</span>
                  </button>
                </div>

                {recentTasks.length > 0 ? (
                  <div className="recent-task-list">
                    {recentTasks.map((item) => (
                      <ActivityItem
                        key={item.id}
                        task={item}
                        onView={() => openSavedTask(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-state-icon">↗</span>

                    <strong>
                      Your activity starts here
                    </strong>

                    <p>
                      Choose an agent to prepare your first task.
                    </p>

                    <button
                      className="secondary-button"
                      onClick={() => openPage("Marketplace")}
                    >
                      Browse agents
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Marketplace */}
          {activePage === "Marketplace" && (
            <>
              <section className="page-heading">
                <p className="eyebrow">
                  THE AGENT DIRECTORY
                </p>

                <h1>
                  Agent <span>marketplace.</span>
                </h1>

                <p className="section-description">
                  Find an agent for your next job. Select an
                  agent to prepare a task.
                </p>
              </section>

              <div className="marketplace-source-row" role="status">
                <span className="demo-tag">
                  {agentsLoading
                    ? "SYNCING AGENTS"
                    : agentsSource === "live"
                      ? "LIVE API DATA"
                      : "DEMO AGENTS"}
                </span>
                {agentsLoading && (
                  <span className="form-note">Loading agent directory...</span>
                )}
                {agentsError && (
                  <span className="form-note">{agentsError} Showing demo agents instead.</span>
                )}
              </div>

              <section className="marketplace-filters" aria-label="Agent search and filters">
                <div className="marketplace-controls">
                  <div className="search-box marketplace-search">
                    <span aria-hidden="true">⌕</span>

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setSearch("");
                      }}
                      placeholder="Search by name, skill, category, or ID..."
                      aria-label="Search agents by name, skill, category, or ID"
                    />

                    {search && (
                      <button
                        className="search-clear"
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear agent search"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <label className="sort-control">
                    <span>Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      aria-label="Sort agents"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="name">Name A–Z</option>
                      <option value="budget-low">Budget: low to high</option>
                      <option value="budget-high">Budget: high to low</option>
                      <option value="rating">Rating: high to low</option>
                    </select>
                  </label>
                </div>

                <div className="filter-heading">
                  <span className="filter-label">FILTER BY CATEGORY</span>
                  <div className="filter-summary-actions">
                    <span className="results-count">
                      {filteredAgents.length} of {agents.length} agents
                    </span>
                    {(search || selectedCategory !== "All categories" || sortBy !== "recommended") && (
                      <button
                        className="text-button reset-filters"
                        type="button"
                        onClick={resetMarketplaceFilters}
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>

                <div className="filter-chips" role="group" aria-label="Filter agents by category">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`filter-chip ${selectedCategory === category ? "active" : ""}`}
                      aria-pressed={selectedCategory === category}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                      {category === "All categories" && (
                        <span className="filter-chip-count">{agents.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {filteredAgents.length > 0 ? (
                <div className="agent-grid marketplace-grid">
                  {filteredAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onChoose={chooseAgent}
                    />
                  ))}
                </div>
              ) : (
                <div className="panel marketplace-empty">
                  <div className="empty-state">
                    <span className="empty-state-icon">⌕</span>
                    <strong>No agents found</strong>
                    <p>Try a different keyword or choose another category.</p>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={resetMarketplaceFilters}
                    >
                      Clear search and filters
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Task Workspace */}
          {activePage === "Run a task" && (
            <>
              <section className="page-heading">
                <p className="eyebrow">TASK WORKSPACE</p>

                <h1>
                  Put an agent <span>to work.</span>
                </h1>

                <p className="section-description">
                  Describe the job, choose your budget, and
                  validate your task before backend integration.
                  Prepared tasks are saved in this browser.
                </p>
              </section>

              <div className="task-layout">
                {/* Task Form */}
                <form
                  className="panel task-form"
                  onSubmit={handleTaskSubmit}
                  noValidate
                >
                  <label htmlFor="agent-select">
                    Select an agent
                  </label>

                  <select
                    id="agent-select"
                    value={selectedAgent}
                    onChange={(event) => {
                      const agent = agents.find(
                        (item) =>
                          item.id === event.target.value
                      );

                      if (agent) {
                        setSelectedAgent(agent.id);
                        setBudget(agent.price);
                        setTaskError("");
                      }
                    }}
                    required
                  >
                    {agents.map((agent) => (
                      <option
                        key={agent.id}
                        value={agent.id}
                      >
                        {agent.name}
                      </option>
                    ))}
                  </select>

                  {selectedAgentDetails && (
                    <p className="form-note">
                      Selected: {selectedAgentDetails.name} ·
                      {selectedAgentDetails.price != null
                        ? `Suggested budget: $${selectedAgentDetails.price}`
                        : "No default price supplied by the API; set your maximum budget below."}
                    </p>
                  )}

                  <label htmlFor="task-prompt">
                    Task instructions
                  </label>

                  <textarea
                    id="task-prompt"
                    value={task}
                    onChange={handleTaskChange}
                    placeholder="Example: Identify three trends in a sample dataset and explain why they matter."
                    rows={6}
                    required
                    aria-invalid={Boolean(taskError)}
                    aria-describedby={
                      taskError ? "task-error" : undefined
                    }
                  />

                  <div className="form-note">
                    {task.trim().length} characters · Minimum 10
                  </div>

                  <label htmlFor="task-budget">
                    Maximum budget (USD)
                  </label>

                  <input
                    id="task-budget"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={budget}
                    onChange={(event) => {
                      setBudget(event.target.value);

                      if (taskError) {
                        setTaskError("");
                      }
                    }}
                    placeholder="0.05"
                    required
                    aria-invalid={Boolean(taskError)}
                    aria-describedby={
                      taskError ? "task-error" : undefined
                    }
                  />

                  {taskError && (
                    <p
                      id="task-error"
                      className="form-note"
                      style={{ color: "#ff8c7a" }}
                      role="alert"
                    >
                      {taskError}
                    </p>
                  )}

                  <button
                    className="primary-button submit-button"
                    type="submit"
                    disabled={taskSubmitting}
                  >
                    {taskSubmitting
                      ? "Submitting task..."
                      : backendStatus === "connected"
                        ? "Submit task to backend"
                        : "Prepare local demo task"}
                    {!taskSubmitting && <span>↗</span>}
                  </button>

                  <p className="form-note">
                    {backendStatus === "connected"
                      ? "Submitting uses the backend API. A successful API response does not by itself verify a blockchain payment."
                      : "Local demo mode. No AI request or payment will occur."}
                  </p>

                  {taskNotice && (
                    <p className="form-note" role="status">
                      {taskNotice}
                    </p>
                  )}

                  <p className="form-note" role="status">
                    {storageStatus === "checking"
                      ? "Checking browser storage..."
                      : storageStatus === "saved"
                        ? "Task history is saved in this browser."
                        : "Browser storage is unavailable. Tasks may not survive refresh."}
                  </p>
                </form>

                {/* Task Result */}
                <div className="panel result-panel">
                  <p className="eyebrow">TASK OUTPUT</p>

                  <h2>
                    {latestTask
                      ? "Task prepared"
                      : "Awaiting instructions"}
                  </h2>

                  {latestTask ? (
                    <>
                      <span className="status-label">
                        {latestTask.status}
                      </span>

                      <p>{latestTask.result}</p>

                      <p className="form-note">
                        {latestTask.executionMode === "backend"
                          ? "Response received from backend. Payment verification must be confirmed separately."
                          : "Local demo record · No AI execution or payment."}
                      </p>

                      <div className="result-meta">
                        <span>Demo ID</span>
                        <strong>{latestTask.id}</strong>
                      </div>

                      <div className="result-meta">
                        <span>Selected agent</span>
                        <strong>{latestTask.agent}</strong>
                      </div>

                      <div className="result-meta">
                        <span>Maximum budget</span>
                        <strong>${latestTask.budget}</strong>
                      </div>

                      <div className="result-meta">
                        <span>Created</span>
                        <strong>{latestTask.createdAt}</strong>
                      </div>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setTask("");
                          setTaskError("");
                          setActiveTaskId(null);
                        }}
                        style={{ marginTop: "20px" }}
                      >
                        Prepare another task
                      </button>
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-state-icon">ϟ</span>

                      <strong>No task prepared yet</strong>

                      <p>
                        Fill out the form and select Validate and
                        prepare task. The result will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Saved Task History / Transactions */}
          {activePage === "Transactions" && (
            <>
              <section className="page-heading">
                <p className="eyebrow">TASK & PAYMENT ACTIVITY</p>

                <h1>
                  Task <span>history.</span>
                </h1>

                <p className="section-description">
                  Review tasks saved in this browser, including the selected
                  agent, proposed budget, creation date, and preparation status.
                  These records are not blockchain transactions.
                </p>
              </section>

              <section className="stats-grid">
                <StatCard
                  label="Saved tasks"
                  value={String(preparedTasks.length).padStart(2, "0")}
                  detail="Stored in this browser"
                  icon="ϟ"
                />

                <StatCard
                  label="Proposed budgets"
                  value={`$${proposedBudgetTotal.toFixed(2)}`}
                  detail="Not actual spending"
                  icon="$"
                />

                <StatCard
                  label="Verified payments"
                  value="00"
                  detail="Payment integration pending"
                  icon="⇄"
                />
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">LOCAL STORAGE</p>
                    <h2>Saved tasks</h2>
                  </div>

                  <span className="demo-tag">
                    {preparedTasks.length} RECORDS
                  </span>
                </div>

                {preparedTasks.length > 0 && (
                  <div className="marketplace-toolbar">
                    <div className="search-box">
                      <span>⌕</span>
                      <input
                        value={historySearch}
                        onChange={(event) => setHistorySearch(event.target.value)}
                        placeholder="Search by agent, task, or ID..."
                        aria-label="Search saved task history"
                      />
                      <kbd>FILTER</kbd>
                    </div>

                    <span className="results-count">
                      {filteredHistoryTasks.length} of {preparedTasks.length} tasks
                    </span>
                  </div>
                )}

                {preparedTasks.length === 0 ? (
                  <div className="panel transaction-placeholder">
                    <span className="empty-state-icon">⇄</span>
                    <h2>No saved tasks yet</h2>
                    <p>
                      Prepared demo tasks will appear here after you submit a
                      valid task in the Run a task workspace.
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => openPage("Marketplace")}
                    >
                      Explore agents
                    </button>
                  </div>
                ) : filteredHistoryTasks.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">⌕</span>
                    <strong>No matching saved tasks</strong>
                    <p>Try searching with a different agent name, task phrase, or ID.</p>
                    <button
                      className="secondary-button"
                      onClick={() => setHistorySearch("")}
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="activity-block" style={{ padding: "8px 22px" }}>
                    {filteredHistoryTasks.map((item, index) => (
                      <div
                        className="activity-row"
                        key={item.id}
                        style={{
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          borderTop: index === 0 ? "none" : undefined,
                          paddingTop: index === 0 ? "12px" : undefined,
                        }}
                      >
                        <span className="activity-icon">ϟ</span>

                        <div className="activity-info" style={{ flex: "1 1 220px" }}>
                          <strong>{item.agent || "Unknown agent"}</strong>
                          <span title={item.task}>{item.task || "No task description"}</span>
                          <span>
                            {item.id || "No ID"} · {item.createdAt || "Date unavailable"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: "8px",
                            marginLeft: "auto",
                          }}
                        >
                          <strong style={{ color: "var(--accent)", fontSize: "14px" }}>
                            ${Number(item.budget ?? 0).toFixed(2)} proposed
                          </strong>

                          <span className="status-label">
                            {item.status || "Prepared"}
                          </span>

                          <span style={{ color: "var(--muted)", fontSize: "10px" }}>
                            Not a payment record
                          </span>

                          <button
                            className="text-button"
                            type="button"
                            onClick={() => openSavedTask(item)}
                          >
                            View task →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <p className="form-note">
                Storage status: {storageStatus === "saved"
                  ? "Task history is saved in this browser."
                  : storageStatus === "unavailable"
                    ? "Browser storage is unavailable; history may not survive refresh."
                    : "Checking browser storage..."}
                Real payment transactions will be added after backend and x402 integration.
              </p>
            </>
          )}

          <footer className="dashboard-footer">
            <span>
              AGENTPAY <span className="footer-accent">●</span>
            </span>

            <span>
              Autonomous agent commerce · Frontend preview
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function LandingPage({
  agents,
  agentsSource,
  backendStatus,
  onNavigate,
}) {
  function scrollToFeatures() {
    document.getElementById("agentpay-how-it-works")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="agentpay-landing-shell">
      <div className="landing-ambient landing-ambient-left" />
      <div className="landing-ambient landing-ambient-right" />

      <main className="landing-site-frame">
        <header className="landing-navbar">
          <button
            className="landing-brand"
            type="button"
            onClick={() => onNavigate("Home")}
            aria-label="AgentPay home"
          >
            <span className="landing-brand-mark"><span>A</span></span>
            <span>Agent<span className="landing-brand-accent">Pay</span></span>
          </button>

          <nav className="landing-nav-links" aria-label="Main navigation">
            <button type="button" className="landing-nav-link active" onClick={() => onNavigate("Home")}>
              Home
            </button>
            <button type="button" className="landing-nav-link" onClick={() => onNavigate("Marketplace")}>
              Marketplace
            </button>
            <button type="button" className="landing-nav-link" onClick={scrollToFeatures}>
              How it works
            </button>
            <button type="button" className="landing-nav-link" onClick={() => onNavigate("Transactions")}>
              History
            </button>
          </nav>

          <button
            className="landing-top-cta"
            type="button"
            onClick={() => onNavigate("Overview")}
          >
            Open dashboard <span>↗</span>
          </button>

          <button
            className="landing-mobile-cta"
            type="button"
            onClick={() => onNavigate("Overview")}
            aria-label="Open dashboard"
          >
            ↗
          </button>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-grid" />
          <div className="landing-hero-beam" />
          <div className="landing-hero-orb landing-hero-orb-one" />
          <div className="landing-hero-orb landing-hero-orb-two" />

          <div className="landing-hero-content">
            <div className="landing-proof-pill">
              <span className="landing-proof-live" />
              <span>THE AUTONOMOUS ECONOMY</span>
              <span className="landing-proof-divider">•</span>
              <span>{agents.length} specialist agents</span>
            </div>

            <h1>
              Let agents work.
              <br />
              <span>Let value flow.</span>
            </h1>

            <p className="landing-hero-description">
              Discover specialist AI agents, delegate work, and bring
              autonomous task execution and payments into one workspace.
            </p>

            <div className="landing-hero-actions">
              <button
                className="landing-primary-cta"
                type="button"
                onClick={() => onNavigate("Overview")}
              >
                Launch dashboard <span>↗</span>
              </button>

              <button
                className="landing-secondary-cta"
                type="button"
                onClick={() => onNavigate("Marketplace")}
              >
                Explore agents <span>↗</span>
              </button>
            </div>

            <div className="landing-trust-row">
              <span className="landing-trust-dot" />
              <span>12 agent profiles</span>
              <span className="landing-trust-separator">/</span>
              <span>Persistent local task history</span>
              <span className="landing-trust-separator">/</span>
              <span>x402 payment flow planned</span>
            </div>
          </div>

          <div className="landing-corner-label landing-corner-label-left">AGENT COMMERCE / 001</div>
          <div className="landing-corner-label landing-corner-label-right">AUTONOMOUS BY DESIGN</div>
        </section>

        <section className="landing-how-section" id="agentpay-how-it-works">
          <div className="landing-section-title">
            <span className="landing-overline">BUILT FOR AGENT COMMERCE</span>
            <h2>A smarter way for agents to <span>get work done.</span></h2>
            <p>A polished workspace for finding agents, preparing tasks and bringing payment verification into the same flow.</p>
          </div>

          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <span className="landing-feature-icon">▦</span>
              <small>01 / DISCOVER</small>
              <h3>Find the right agent</h3>
              <p>Explore 12 specialized demo profiles with marketplace search, categories and sorting.</p>
              <button type="button" onClick={() => onNavigate("Marketplace")}>Browse marketplace ↗</button>
            </article>
            <article className="landing-feature-card">
              <span className="landing-feature-icon purple">ϟ</span>
              <small>02 / DELEGATE</small>
              <h3>Prepare a task</h3>
              <p>Choose an agent, set a maximum budget and inspect a structured task record.</p>
              <button type="button" onClick={() => onNavigate("Run a task")}>Open task workspace ↗</button>
            </article>
            <article className="landing-feature-card">
              <span className="landing-feature-icon blue">⇄</span>
              <small>03 / VERIFY</small>
              <h3>Track the flow</h3>
              <p>Review saved task activity now; connect verified payment records during backend integration.</p>
              <button type="button" onClick={() => onNavigate("Transactions")}>View task history ↗</button>
            </article>
          </div>
        </section>

        <footer className="landing-footer">
          <button className="landing-brand" type="button" onClick={() => onNavigate("Home")}>
            <span className="landing-brand-mark"><span>A</span></span>
            <span>Agent<span className="landing-brand-accent">Pay</span></span>
          </button>
          <span>Autonomous agent commerce · Frontend preview</span>
          <button type="button" onClick={() => onNavigate("Marketplace")}>Explore agents ↗</button>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail, icon }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-detail">
        <span className="status-dot" />
        {detail}
      </div>
    </article>
  );
}

function AgentCard({ agent, onChoose }) {
  return (
    <article className="agent-card">
      <div className="agent-card-top">
        <div className={`agent-icon ${agent.color}`}>
          {agent.icon}
        </div>

        {agent.rating && (
          <span className="agent-rating">
            ★ {agent.rating}
          </span>
        )}
      </div>

      <p className="agent-category">{agent.category}</p>
      <h3>{agent.name}</h3>
      <p className="agent-description">{agent.description}</p>

      <div className="agent-card-bottom">
        <div className="agent-price">
          <strong>{agent.price != null ? `$${agent.price}` : "Not listed"}</strong>
          <span>
            {agent.price != null
              ? "Budget guide · verify with backend"
              : "Price not provided by API"}
          </span>
        </div>

        <button
          className="agent-action"
          onClick={() => onChoose(agent)}
          aria-label={`Prepare a task for ${agent.name}`}
          title={`Choose ${agent.name}`}
        >
          ↗
        </button>
      </div>
    </article>
  );
}

function ActivityItem({ task, onView }) {
  return (
    <div className="activity-row recent-task-row">
      <span className="activity-icon">ϟ</span>

      <div className="activity-info">
        <strong>{task.agent}</strong>
        <span className="activity-task-text">{task.task}</span>
        <span className="activity-date-text">
          {task.createdAt || "Date unavailable"} · {task.id || "No ID"}
        </span>
      </div>

      <div className="recent-task-side">
        <span className="status-label">{task.status || "Prepared"}</span>
        <strong className="recent-task-budget">
          ${Number(task.budget ?? 0).toFixed(2)} proposed
        </strong>
      </div>

      <button
        className="text-button recent-task-view"
        type="button"
        onClick={onView}
      >
        View <span>→</span>
      </button>
    </div>
  );
}

// Responsive layout rules are in styles.css; this component keeps
// the same 12-agent, marketplace, local-history, and task workflows.
export default App;
