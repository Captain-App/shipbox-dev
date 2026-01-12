import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoxWorkspace } from "./BoxWorkspace";

describe("BoxWorkspace Component", () => {
  const sandbox = {
    id: "sb-1",
    title: "Test Box",
    status: "active",
    webUiUrl: "https://preview.shipbox.dev/sb-1",
  };
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollBy/scrollTo
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders the header and back button", () => {
    render(<BoxWorkspace sandbox={sandbox as any} onClose={onClose} />);

    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getAllByText("Test Box").length).toBeGreaterThan(0);
  });

  it("renders the chat panel and iframe", () => {
    render(<BoxWorkspace sandbox={sandbox as any} onClose={onClose} />);

    expect(
      screen.getAllByPlaceholderText(/Ask your agent.../i)[0],
    ).toBeInTheDocument();
    expect(screen.getByTitle(/Test Box Preview/i)).toBeInTheDocument();
  });

  it("toggles fullscreen mode", () => {
    render(<BoxWorkspace sandbox={sandbox as any} onClose={onClose} />);

    const chatInput = screen.getAllByPlaceholderText(/Ask your agent.../i)[0];
    expect(chatInput).toBeInTheDocument();

    const fullscreenButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-maximize2"));
    if (!fullscreenButton) throw new Error("Fullscreen button not found");

    fireEvent.click(fullscreenButton);

    // Chat panel should be hidden in fullscreen (on desktop)
    // Note: The mobile chat might still be in the DOM but hidden by CSS,
    // but here it should be removed from DOM because it's only rendered conditionally or hidden by parent
    expect(screen.queryAllByPlaceholderText(/Ask your agent.../i).length).toBe(
      1,
    ); // Only mobile one remains?
  });

  it("calls onClose when back button is clicked", () => {
    render(<BoxWorkspace sandbox={sandbox as any} onClose={onClose} />);

    fireEvent.click(screen.getByText("Back"));
    expect(onClose).toHaveBeenCalled();
  });
});
