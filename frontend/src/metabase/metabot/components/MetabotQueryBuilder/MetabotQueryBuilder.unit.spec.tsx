import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { Route } from "react-router";

import {
  setupBookmarksEndpoints,
  setupMetabotListModelsEndpoint,
} from "__support__/server-mocks";
import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen, waitFor } from "__support__/ui";
import { useGetSuggestedMetabotPromptsQuery } from "metabase/api";
import {
  useMetabotAgent,
  useUserMetabotPermissions,
} from "metabase/metabot/hooks";
import { createMockState } from "metabase/redux/store/mocks";

import { MetabotQueryBuilder } from "./MetabotQueryBuilder";

jest.mock("metabase/api", () => ({
  ...jest.requireActual("metabase/api"),
  useGetSuggestedMetabotPromptsQuery: jest.fn(),
}));

jest.mock("metabase/metabot/hooks", () => ({
  ...jest.requireActual("metabase/metabot/hooks"),
  useMetabotAgent: jest.fn(),
  useUserMetabotPermissions: jest.fn(),
}));

// Hide the QueryBuilder prop type the wrapper inherits — it's irrelevant
// since the canUseNlq path renders the inner component with no props.
const TestSubject = MetabotQueryBuilder as ComponentType;

type SetupOptions = {
  modelOverride?: string;
  showIllustrations?: boolean;
  prompt?: string;
  suggestedPrompts?: { prompt: string }[];
};

function setup({
  modelOverride,
  showIllustrations = true,
  prompt = "",
  suggestedPrompts = [],
}: SetupOptions = {}) {
  const resetConversation = jest.fn();
  const submitInput = jest.fn().mockResolvedValue({
    type: "metabase/metabot/submitInput/fulfilled",
    meta: { requestId: "test-request", requestStatus: "fulfilled" },
    payload: {
      success: true,
      data: { processedResponse: { data: [{ type: "navigate_to" }] } },
    },
  });
  const setModelOverride = jest.fn();

  jest.mocked(useUserMetabotPermissions).mockReturnValue({
    hasNlqAccess: true,
    canUseNlq: true,
  } as any);

  setupBookmarksEndpoints([]);
  setupMetabotListModelsEndpoint();

  jest.mocked(useMetabotAgent).mockReturnValue({
    setVisible: jest.fn(),
    resetConversation,
    submitInput,
    cancelRequest: jest.fn(),
    setPrompt: jest.fn(),
    metabotId: "default",
    isDoingScience: false,
    modelOverride,
    setModelOverride,
    prompt,
    promptInputRef: { current: null },
  } as any);
  jest.mocked(useGetSuggestedMetabotPromptsQuery).mockReturnValue({
    currentData: { prompts: suggestedPrompts },
  } as any);

  const settings = mockSettings({
    "metabot-show-illustrations": showIllustrations,
    "llm-metabot-provider": "anthropic/claude-haiku-4-5",
    "llm-metabot-conversation-model-selection-enabled": true,
  });

  const view = renderWithProviders(<Route path="/" component={TestSubject} />, {
    withRouter: true,
    storeInitialState: createMockState({ settings }),
  });

  return { ...view, resetConversation, setModelOverride, submitInput };
}

describe("MetabotQueryBuilder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Metabot illustration when metabot-show-illustrations is true", () => {
    setup({ showIllustrations: true });
    expect(screen.getByRole("img", { name: "Metabot" })).toBeInTheDocument();
  });

  it("hides the Metabot illustration when metabot-show-illustrations is false", () => {
    setup({ showIllustrations: false });
    expect(
      screen.queryByRole("img", { name: "Metabot" }),
    ).not.toBeInTheDocument();
  });

  it("renders suggested prompts when the API returns them", () => {
    setup({
      suggestedPrompts: [
        { prompt: "Show me top customers" },
        { prompt: "How many orders this month?" },
      ],
    });
    expect(screen.getByText("Show me top customers")).toBeInTheDocument();
    expect(screen.getByText("How many orders this month?")).toBeInTheDocument();
  });

  it("disables the send button when the prompt is empty", () => {
    setup({ prompt: "" });
    expect(screen.getByTestId("metabot-send-message")).toBeDisabled();
  });

  it("enables the send button when the prompt is non-empty", () => {
    setup({ prompt: "anything" });
    expect(screen.getByTestId("metabot-send-message")).toBeEnabled();
  });

  it("renders the model selector and changes the model override", async () => {
    const { setModelOverride } = setup();

    const modelSelector = screen.getByTestId("metabot-model-selector");
    await waitFor(() => expect(modelSelector).toBeEnabled());

    await userEvent.click(modelSelector);
    await userEvent.click(
      await screen.findByRole("option", { name: /Claude Opus 4\.1/ }),
    );

    expect(setModelOverride).toHaveBeenCalledWith("anthropic/claude-opus-4-1");
  });

  it("preserves the selected model override when submitting", async () => {
    const { resetConversation, setModelOverride, submitInput } = setup({
      modelOverride: "anthropic/claude-opus-4-1",
      prompt: "Show me orders",
    });

    await userEvent.click(screen.getByTestId("metabot-send-message"));

    expect(resetConversation).toHaveBeenCalled();
    expect(setModelOverride).toHaveBeenCalledWith("anthropic/claude-opus-4-1");
    expect(submitInput).toHaveBeenCalledWith("Show me orders", {
      profile: "nlq",
      preventOpenSidebar: true,
    });
  });
});
