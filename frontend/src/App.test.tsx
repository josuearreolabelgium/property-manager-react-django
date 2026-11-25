import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_URL } from "./api";
import App from "./App";
import { server } from "./test/server";

function renderApp() {
  // New client per test, no retries, so tests are isolated and fail fast.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("shows properties from the API", async () => {
    renderApp();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(await screen.findByText("Torre Andares")).toBeInTheDocument();
    expect(screen.getByText("Bodega Apodaca")).toBeInTheDocument();
  });

  it("fills the city dropdown from the API", async () => {
    renderApp();
    expect(await screen.findByRole("option", { name: "Monterrey" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Guadalajara" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "CDMX" })).not.toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    server.use(http.get(API_URL, () => HttpResponse.json({ detail: "boom" }, { status: 500 })));
    renderApp();
    expect(await screen.findByText(/Could not load properties/)).toBeInTheDocument();
  });

  it("creates a property and refetches the list", async () => {
    let created = false;
    server.use(
      http.post(API_URL, async ({ request }) => {
        created = true;
        return HttpResponse.json({ id: 3, created_at: "", ...(await request.json() as object) }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Torre Andares");

    await user.type(screen.getByPlaceholderText("Name"), "Oficina Centro");
    await user.type(screen.getByPlaceholderText("City"), "CDMX");
    await user.type(screen.getByPlaceholderText("Size m²"), "120");
    await user.type(screen.getByPlaceholderText("Monthly rent"), "30000");
    await user.click(screen.getByRole("button", { name: "Add property" }));

    await screen.findByRole("button", { name: "Add property" }); // back to idle
    expect(created).toBe(true);
    expect(screen.getByPlaceholderText("Name")).toHaveValue(""); // form was reset
  });
});
