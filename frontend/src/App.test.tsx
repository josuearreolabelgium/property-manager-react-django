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

  describe("city map", () => {
    it("opens with focus inside, encodes the city, and closes on Esc returning focus", async () => {
      const city = "San Pedro Garza García";
      server.use(http.get(API_URL, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [{ ...properties[0], city }] })));
      const user = userEvent.setup();
      renderApp();
      const pin = await screen.findByRole("button", { name: `Show map of ${city}` });
      await user.click(pin);

      expect(screen.getByRole("dialog", { name: city })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close map" })).toHaveFocus();
      expect(screen.getByTitle(`Map of ${city}`))
        .toHaveAttribute("src", expect.stringContaining("q=San%20Pedro%20Garza%20Garc%C3%ADa&"));

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pin).toHaveFocus();
    });

    it("closes with the × button", async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));
      await user.click(screen.getByRole("button", { name: "Close map" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes on a backdrop click but not on a click inside", async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));

      await user.click(screen.getByRole("heading", { name: "Monterrey" })); // inside the pop-up
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("dialog")); // the dialog element itself = the backdrop
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("search", () => {
    // Records every list request and serves 2 pages so pagination can be tested
    function recordRequests() {
      const requests: { page: string | null; search: string | null; city: string | null }[] = [];
      server.use(
        http.get(API_URL, ({ request }) => {
          const params = new URL(request.url).searchParams;
          const page = params.get("page");
          const search = params.get("search");
          requests.push({ page, search, city: params.get("city") });
          const results = search ? properties.filter((p) => p.name.toLowerCase().includes(search)) : properties;
          return HttpResponse.json({
            count: results.length,
            next: page === "1" && !search ? "next" : null,
            previous: page === "2" ? "prev" : null,
            results,
          });
        }),
      );
      return requests;
    }
    const DEBOUNCE = { timeout: 2000 }; // generous waitFor so slow CI machines don't flake

    it("sends one debounced request for the full term, combined with the city filter", async () => {
      const requests = recordRequests();
      const user = userEvent.setup();
      renderApp();
      await screen.findByText("Bodega Apodaca");
      await user.selectOptions(await screen.findByRole("combobox", { name: "" }), "Guadalajara");

      await user.type(screen.getByLabelText("Search properties"), "torre");
      await waitFor(() => expect(screen.queryByText("Bodega Apodaca")).not.toBeInTheDocument(), DEBOUNCE);

      expect(requests).toEqual([
        { page: "1", search: null, city: null },
        { page: "1", search: null, city: "Guadalajara" },
        { page: "1", search: "torre", city: "Guadalajara" }, // no request per keystroke
      ]);
    });

    it("goes back to page 1 when the search term changes", async () => {
      const requests = recordRequests();
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "Next →" }));
      await screen.findByText("Page 2 · 2 total");

      await user.type(screen.getByLabelText("Search properties"), "torre");
      await screen.findByText("Page 1 · 1 total", undefined, DEBOUNCE);
      expect(requests.at(-1)).toEqual({ page: "1", search: "torre", city: null });
    });

    it("keeps the current page when only spaces are typed", async () => {
      const requests = recordRequests();
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "Next →" }));
      await screen.findByText("Page 2 · 2 total");

      await user.type(screen.getByLabelText("Search properties"), "   ");
      await new Promise((r) => setTimeout(r, 500)); // let the 300 ms debounce run
      expect(screen.getByText("Page 2 · 2 total")).toBeInTheDocument();
      expect(requests.map((r) => r.page)).toEqual(["1", "2"]);
    });
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
