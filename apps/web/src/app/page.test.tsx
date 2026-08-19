import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page", () => {
  it("renders the frontend foundation shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /frontend foundation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/desktop \+ mobile/i)).toBeInTheDocument();
  });
});
