import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_URL } from "./api";
import App from "./App";
import { properties, server } from "./test/server";

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

  it("converts the rent when another currency is selected", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByText("MX$85,000.00")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("option", { name: "EUR" })).toBeEnabled());
    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    expect(screen.getByText("Rent (EUR)")).toBeInTheDocument();
    expect(screen.getByText("€4,250.00")).toBeInTheDocument(); // 85,000 MXN x 0.05
  });

  it("opens and closes the map of a city", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));

    const map = screen.getByTitle("Map of Monterrey");
    expect(map).toHaveAttribute("src", expect.stringContaining("q=Monterrey"));

    await user.keyboard("{Escape}");
    expect(screen.queryByTitle("Map of Monterrey")).not.toBeInTheDocument();
  });

  it("searches properties through the API", async () => {
    const searches: (string | null)[] = [];
    server.use(
      http.get(API_URL, ({ request }) => {
        const search = new URL(request.url).searchParams.get("search");
        searches.push(search);
        const results = search ? properties.filter((p) => p.name.toLowerCase().includes(search)) : properties;
        return HttpResponse.json({ count: results.length, next: null, previous: null, results });
      }),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Bodega Apodaca");

    await user.type(screen.getByLabelText("Search properties"), "torre");

    await waitFor(() => expect(screen.queryByText("Bodega Apodaca")).not.toBeInTheDocument());
    expect(screen.getByText("Torre Andares")).toBeInTheDocument();
    expect(searches).toContain("torre");
    expect(searches).not.toContain("t"); // debounced: no request per keystroke
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
