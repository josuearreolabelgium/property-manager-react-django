import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_URL, RATES_URL } from "./api";
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

    await waitFor(() => expect(within(screen.getByLabelText("Currency")).getByRole("option", { name: "EUR" })).toBeEnabled());
    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    expect(screen.getByText("€4,250.00")).toBeInTheDocument(); // 85,000 MXN x 0.05

    await user.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByText("Price (EUR)")).toBeInTheDocument();
    expect(screen.getByText("€4,250.00")).toBeInTheDocument();
  });

  it("shows building details, size ranges, rents in other currencies and prices on request", async () => {
    server.use(http.get(API_URL, () => HttpResponse.json({
      count: 2, next: null, previous: null, results: [
        { ...properties[0], id: 10, name: "JAIME NUNÓ", address: "Av. Insurgentes Sur 1921", postal_code: "01020",
          city: "Ciudad de México", size_m2: 475, size_max_m2: 33277, monthly_rent: null, rent_currency: "USD" },
        { ...properties[0], id: 11, name: "MAGDALENA 211", monthly_rent: "1200.00", rent_currency: "USD" },
      ],
    })));
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText("475 – 33,277")).toBeInTheDocument();
    expect(screen.getByText("CP 01020", { exact: false })).toBeInTheDocument(); // leading zero kept
    expect(screen.getByText("On request (USD)")).toBeInTheDocument();
    // Stored in USD, shown in MXN: 1,200 / 0.06
    expect(await screen.findByText("MX$20,000.00")).toBeInTheDocument();

    await waitFor(() => expect(within(screen.getByLabelText("Currency")).getByRole("option", { name: "USD" })).toBeEnabled());
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
  });

  it("points the side map at the first listing, then at the one chosen", async () => {
    const user = userEvent.setup();
    renderApp();
    const map = await screen.findByTitle("Map of Torre Andares");
    expect(map).toHaveAttribute("src", expect.stringContaining(encodeURIComponent("Av. Patria 1891, 45116, Guadalajara")));

    await user.click(screen.getByRole("button", { name: "Show Bodega Apodaca on map" }));
    expect(screen.getByTitle("Map of Bodega Apodaca"))
      .toHaveAttribute("src", expect.stringContaining("q=Monterrey&"));
  });

  it("sends the sort order and the type and operation filters to the API", async () => {
    const urls: URL[] = [];
    server.use(http.get(API_URL, ({ request }) => {
      urls.push(new URL(request.url));
      return HttpResponse.json({ count: 2, next: null, previous: null, results: properties });
    }));
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Torre Andares");

    await user.selectOptions(screen.getByLabelText("Sort by"), "Size: largest first");
    await user.selectOptions(screen.getByLabelText("Filter by type"), "Office");
    await user.selectOptions(screen.getByLabelText("Filter by operation"), "Rent");

    await waitFor(() => expect(urls).toHaveLength(4));
    const last = urls.at(-1)!.searchParams;
    expect(last.get("ordering")).toBe("-size_m2");
    expect(last.get("property_type")).toBe("office");
    expect(last.get("operation")).toBe("rent");
    expect(last.get("page")).toBe("1");
  });

  describe("city map", () => {
    it("opens with focus inside, encodes the city, and closes on Esc returning focus", async () => {
      const city = "San Pedro Garza García";
      server.use(http.get(API_URL, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [{ ...properties[0], city }] })));
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole("button", { name: "Table" }));
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
      await user.click(screen.getByRole("button", { name: "Table" }));
      await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));
      await user.click(screen.getByRole("button", { name: "Close map" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes on a backdrop click but not on a click inside", async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole("button", { name: "Table" }));
      await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));

      await user.click(screen.getByRole("heading", { name: "Monterrey" })); // inside the pop-up
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("dialog")); // the dialog element itself = the backdrop
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("stays open when a press starts inside and is released on the backdrop", async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole("button", { name: "Table" }));
      await user.click(await screen.findByRole("button", { name: "Show map of Monterrey" }));

      const dialog = screen.getByRole("dialog");
      await user.pointer([
        { keys: "[MouseLeft>]", target: screen.getByRole("heading", { name: "Monterrey" }) },
        { target: dialog },
        { keys: "[/MouseLeft]", target: dialog },
      ]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
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
      await user.selectOptions(await screen.findByRole("combobox", { name: "City" }), "Guadalajara");

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

  describe("new property", () => {
    it("sends the form to the API, closes the pop-up and shows the new building on the map", async () => {
      let created: Record<string, unknown> | null = null;
      server.use(http.post(API_URL, async ({ request }) => {
        created = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ...properties[1], ...created, id: 2 }, { status: 201 });
      }));
      const user = userEvent.setup();
      renderApp();
      await screen.findByText("Torre Andares");
      const open = screen.getByRole("button", { name: "+ New property" });
      await user.click(open);

      const form = within(screen.getByRole("dialog", { name: "New property" }));
      await user.type(form.getByLabelText("Name"), "Torre Nueva");
      await user.selectOptions(form.getByLabelText("Type"), "Industrial");
      await user.type(form.getByLabelText(/^Address/), "Av. Reforma 100");
      await user.type(form.getByLabelText("City"), "Ciudad de México");
      await user.type(form.getByLabelText(/^Postal code/), "06600");
      await user.type(form.getByLabelText("Size (m²)"), "250");
      await user.type(form.getByLabelText(/^Max size/), "1200");
      await user.selectOptions(form.getByLabelText("Currency"), "USD");
      await user.click(form.getByRole("button", { name: "Add property" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(open).toHaveFocus();
      expect(created).toEqual({
        name: "Torre Nueva", property_type: "industrial", operation: "rent", address: "Av. Reforma 100",
        city: "Ciudad de México", postal_code: "06600", size_m2: 250, size_max_m2: 1200,
        monthly_rent: null, rent_currency: "USD", status: "available",
      });
      // The list mock still returns properties 1 and 2; the side map points at the created one (id 2)
      expect(await screen.findByTitle("Map of Bodega Apodaca")).toBeInTheDocument();
    });

    it("shows the API's errors next to the fields and keeps what was typed", async () => {
      server.use(http.post(API_URL, () => HttpResponse.json(
        { name: ["property with this name already exists."], size_max_m2: ["Maximum size cannot be smaller than the minimum size."] },
        { status: 400 },
      )));
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "+ New property" }));
      const form = within(screen.getByRole("dialog", { name: "New property" }));
      await user.type(form.getByLabelText("Name"), "Torre Andares");
      await user.type(form.getByLabelText("City"), "Guadalajara");
      await user.type(form.getByLabelText("Size (m²)"), "500");
      await user.click(form.getByRole("button", { name: "Add property" }));

      expect(await form.findByText("property with this name already exists.")).toBeInTheDocument();
      expect(form.getByText("Maximum size cannot be smaller than the minimum size.")).toBeInTheDocument();
      expect(form.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
      expect(form.getByLabelText("Name")).toHaveAccessibleDescription("property with this name already exists.");
      expect(form.getByLabelText("Name")).toHaveValue("Torre Andares"); // nothing lost
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("shows a general error when the server cannot be reached", async () => {
      server.use(http.post(API_URL, () => HttpResponse.error()));
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "+ New property" }));
      const form = within(screen.getByRole("dialog", { name: "New property" }));
      await user.type(form.getByLabelText("Name"), "X");
      await user.type(form.getByLabelText("City"), "Y");
      await user.type(form.getByLabelText("Size (m²)"), "10");
      await user.click(form.getByRole("button", { name: "Add property" }));
      expect(await form.findByText(/Could not save/)).toBeInTheDocument();
    });

    it("shows errors for fields that have no input (e.g. status) as a general error", async () => {
      server.use(http.post(API_URL, () => HttpResponse.json(
        { status: ['"sold" is not a valid choice.'] }, { status: 400 },
      )));
      const user = userEvent.setup();
      renderApp();
      await user.click(await screen.findByRole("button", { name: "+ New property" }));
      const form = within(screen.getByRole("dialog", { name: "New property" }));
      await user.type(form.getByLabelText("Name"), "X");
      await user.type(form.getByLabelText("City"), "Y");
      await user.type(form.getByLabelText("Size (m²)"), "10");
      await user.click(form.getByRole("button", { name: "Add property" }));
      expect(await form.findByText('Could not save: "sold" is not a valid choice.')).toBeInTheDocument();
    });
  });

  it("labels the price of properties for sale as Price, and rentals as Monthly rent", async () => {
    server.use(http.get(API_URL, () => HttpResponse.json({
      count: 2, next: null, previous: null,
      results: [properties[0], { ...properties[1], operation: "sale" }],
    })));
    renderApp();
    await screen.findByText("Torre Andares");
    expect(screen.getByText("Monthly rent")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
  });

  it("sorts prices that cannot be converted last when exchange rates are unavailable", async () => {
    server.use(
      http.get(RATES_URL.split("?")[0], () => HttpResponse.json({}, { status: 500 })),
      http.get(API_URL, () => HttpResponse.json({
        count: 2, next: null, previous: null, results: [
          { ...properties[0], id: 1, name: "Dollar Tower", monthly_rent: "10000.00", rent_currency: "USD" },
          { ...properties[0], id: 2, name: "Peso Tower", monthly_rent: "50000.00", rent_currency: "MXN" },
        ],
      })),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Exchange rates unavailable", { exact: false });
    await user.click(screen.getByRole("button", { name: "Table" }));

    // Unconverted prices keep their own currency, shown by code, and the header names no currency
    expect(screen.getByText("USD 10,000.00")).toBeInTheDocument();
    const header = screen.getByRole("columnheader", { name: /^Price/ });
    expect(header).not.toHaveTextContent("MXN");
    await user.click(header);
    if (!header.textContent?.includes("▲")) await user.click(header); // make sure it is ascending
    expect(header).toHaveTextContent("▲");

    // 10,000 USD must not be treated as 10,000 MXN and placed before 50,000 MXN
    const names = screen.getAllByRole("row").slice(1).map((r) => r.querySelector("td")?.textContent);
    expect(names).toEqual(["Peso Tower", "Dollar Tower"]);
  });

  it("goes back a page when the last property of the last page is deleted", async () => {
    const lonely = { ...properties[0], id: 11, name: "Lonely Tower" };
    let deleted = false;
    server.use(
      http.get(API_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        if (page === "2") {
          return deleted
            ? HttpResponse.json({ detail: "Invalid page." }, { status: 404 })
            : HttpResponse.json({ count: 11, next: null, previous: "prev", results: [lonely] });
        }
        return HttpResponse.json({ count: deleted ? 10 : 11, next: deleted ? null : "next", previous: null, results: properties });
      }),
      http.delete(`${API_URL}:id/`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Next →" }));
    await user.click(await screen.findByRole("button", { name: "Delete Lonely Tower" }));

    expect(await screen.findByText("Page 1 · 10 total")).toBeInTheDocument();
    expect(screen.queryByText(/Could not load properties/)).not.toBeInTheDocument();
  });
});
