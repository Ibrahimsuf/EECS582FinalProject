import React, { createContext, useContext, useEffect, useState } from "react";
import { getSession } from "./auth";
import { readJSON, writeJSON } from "./storage";

const GroupContext = createContext({
  groups: [],
  activeGroup: null,
  setActiveGroupId: () => {},
  refreshGroups: () => {},
});

const STORAGE_KEY = "teamhub_active_group";
const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export function GroupProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupIdState] = useState(() => readJSON(STORAGE_KEY, null));

  const memberId = getSession()?.memberId;

  async function refreshGroups() {
    if (!memberId) return;
    try {
      const [memberRes, groupRes] = await Promise.all([
        fetch(`${API}/members/${memberId}/`),
        fetch(`${API}/groups/`),
      ]);
      const member = await memberRes.json();
      const allGroups = await groupRes.json();
      const myGroups = allGroups.filter((g) => (member.group || []).includes(g.id));
      setGroups(myGroups);

      // If stored active group is no longer valid, default to first
      setActiveGroupIdState((prev) => {
        const valid = myGroups.find((g) => g.id === prev);
        if (!valid && myGroups.length > 0) {
          writeJSON(STORAGE_KEY, myGroups[0].id);
          return myGroups[0].id;
        }
        return prev;
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshGroups();
  }, [memberId]); // eslint-disable-line

  function setActiveGroupId(id) {
    setActiveGroupIdState(id);
    writeJSON(STORAGE_KEY, id);
  }

  const activeGroup =
    groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  return (
    <GroupContext.Provider value={{ groups, activeGroup, setActiveGroupId, refreshGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
