import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("Application Smoke Test", () => {
  it("mounts the root application and renders main navigation and hero header", () => {
    render(React.createElement(App));

    // Brand logo should be rendered in the navbar
    const brandElements = screen.getAllByText(/jerai/i);
    expect(brandElements.length).toBeGreaterThan(0);

    // Hero title should be present
    expect(screen.getByText(/transform your/i)).toBeInTheDocument();
  });
});
