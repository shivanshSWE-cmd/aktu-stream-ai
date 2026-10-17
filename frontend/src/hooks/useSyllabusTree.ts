"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Branch, Subject } from "@/types";

export function useSyllabusTree(initialBranch: string = "CSE", initialSemester: number = 5) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedSemester, setSelectedSemester] = useState<number>(initialSemester);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load branches list on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        const branchList = await apiClient.getBranches();
        if (isMounted) {
          setBranches(branchList);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load branches");
        }
      }
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch subjects whenever selected branch or semester changes
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSubjects(
        selectedBranch === "ALL" ? undefined : selectedBranch,
        selectedSemester
      );
      setSubjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedSemester]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    selectedSemester,
    setSelectedSemester,
    subjects,
    loading,
    error,
    refresh: fetchSubjects,
  };
}
