/* eslint-disable testing-library/prefer-screen-queries */
import { expect, test } from "@playwright/test";
import { goToDashboard } from "../../flows";

test.use({ storageState: "playwright/.auth/user.json" });

const ROLES = {
  admin: "admin",
  superAdmin: "superadmin",
};

const ENTITY_TYPE = {
  ORGANIZATION: "organization",
  WORKSPACES: "workspace",
};

const organizationNames = {
  SONY: "SONY",
  FANCODE: "FANCODE",
  ZEE_AUTO_SHOW: "ZEE AUTO SHOW",
  VIACOM: "Viacom",
};

function getEntityType(entityId) {
  if (entityId?.includes("org_")) {
    return ENTITY_TYPE.ORGANIZATION;
  } else if (entityId?.includes("ws_")) {
    return ENTITY_TYPE.WORKSPACES;
  } else {
    return null;
  }
}

const ID_PREFIX = `Dashboard-${ROLES.admin}-`;

const buildTestId = (id: string) => `${ID_PREFIX}${id}`;

async function verifyIconVisibility(
  page: any,
  id: string,
  isVisible: boolean,
  expectedText: string = "",
  validateText: boolean = true,
) {
  const testId = buildTestId(id);
  const element = page.getByTestId(testId);

  try {
    await element.waitFor({ state: "visible", timeout: 2500 });
    if (!isVisible) test.fail();
  } catch {
    if (isVisible) test.fail();
  }

  if (isVisible && validateText) {
    await expect(element).toContainText(expectedText);
  }
}

async function toggleNavbarAvatarDropdown(page: any) {
  const dropdown = page.getByTestId(buildTestId("Avatar-Dropdown"));
  await dropdown.click();
}

async function getAPIJSONData(page: any, url: string) {
  const response = await page.waitForResponse((res) => res.url().includes(url) && res.status() === 200);
  const jsonResponse = await response.json();
  return jsonResponse;
}

test("user should be able to view the dashboard", async ({ page }) => {
  await goToDashboard(page);
});

test.describe(`${ROLES.admin} User Access`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test(`${ROLES.admin} should be able to view the Home Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "dashboard", true, "Home");
  });

  test(`${ROLES.admin} should be able to view the Videos Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "videos", true, "Videos");
  });

  test(`${ROLES.admin} should be able to view the Highlights Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "my-highlights", true, "Highlights");
  });

  test(`${ROLES.admin} should view the Rules Icon if ruleManagement permission is enabled`, async ({ page }) => {
    const response = await getAPIJSONData(page, "get-client-settings");
    await page.waitForTimeout(2000);
    const ruleManagementEnabled = response.data.permissions["ruleManagement"];
    await verifyIconVisibility(page, "rule-listing", ruleManagementEnabled, "Rules");
  });

  test(`${ROLES.admin} should view the Archive Icon if showArchival permission is enabled`, async ({ page }) => {
    const response = await getAPIJSONData(page, "get-client-settings");
    await page.waitForTimeout(2000);
    const showArchivalEnabled = response.data.permissions["showArchival"];
    await verifyIconVisibility(page, "archive", showArchivalEnabled, "Archive");
  });

  test(`${ROLES.admin} should view the Studio Icon if advanceEditor permission is enabled`, async ({ page }) => {
    const response = await getAPIJSONData(page, "get-client-settings");
    await page.waitForTimeout(2000);
    const advanceEditorEnabled = response.data.permissions["advanceEditor"];
    await verifyIconVisibility(page, "studio", advanceEditorEnabled, "Studio");
  });

  test(`${ROLES.admin} should view the Settings Icon if roleDetails settings action is enabled`, async ({ page }) => {
    const response = await getAPIJSONData(page, "get-role");
    await page.waitForTimeout(2000);

    const settingsActionEnabled =
      response.data.rolePrivileges
        .find((x) => x.name === "profile-dropdown")
        .actions.find((x) => x.value === "settings").toggle ?? false;
    await verifyIconVisibility(page, "configuration/category", settingsActionEnabled, "Settings");
  });

  test(`${ROLES.admin} should not be able to view the Overview Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "overview", false, "Overview");
  });

  test(`${ROLES.admin} should not be able to view the Organizations Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "organizations", false, "Organizations");
  });

  test(`${ROLES.admin} should not be able to view the Users Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "users", false, "Users");
  });

  test(`${ROLES.admin} should not be able to view the Ops Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "ops", false, "Ops");
  });

  test(`${ROLES.admin} should view the Process Icon`, async ({ page }) => {
    await verifyIconVisibility(page, "Process", true, "Process");
  });

  test(`${ROLES.admin} should view the Profile PopOver`, async ({ page }) => {
    await verifyIconVisibility(page, "Profile-PopOver", true, "", false);
  });

  test(`${ROLES.admin} should view the Avatar Dropdown`, async ({ page }) => {
    await verifyIconVisibility(page, "Avatar-Dropdown", true, "", false);
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Logout Button`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "Logout", true, "Logout");
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Profile Option if roleDetails Profile Option is enabled`, async ({
    page,
  }) => {
    toggleNavbarAvatarDropdown(page);
    const response = await getAPIJSONData(page, "get-role");
    await page.waitForTimeout(2000);

    const settingsActionEnabled =
      response.data.rolePrivileges.find((x) => x.name === "profile-dropdown").actions.find((x) => x.value === "profile")
        .toggle ?? false;
    await verifyIconVisibility(page, "profile", settingsActionEnabled, "Profile");
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Overview Option if roleDetails Profile Option is enabled and entityType is organization and selectedEntityName !== ZEE AUTO SHOW`, async ({
    page,
  }) => {
    const userResponse = await getAPIJSONData(page, "me"); // me is called first
    const roleRepsonse = await getAPIJSONData(page, "get-role");

    await page.waitForTimeout(2000);

    const popover = page.getByTestId(buildTestId("Profile-PopOver"));
    await popover.click();
    const element = page.getByTestId("Dashboard-active-organization");
    await element.waitFor({ state: "visible", timeout: 1000 });
    await popover.click();

    const selectedEntityId = await element.getAttribute("data-key");
    const entityType = getEntityType(selectedEntityId);
    let selectedEntityName;
    console.log({ userResponse: userResponse.data });
    if (entityType === ENTITY_TYPE.ORGANIZATION) {
      selectedEntityName = userResponse.data.entity.organizations.find(
        (x) => x.organizationId === selectedEntityId,
      ).name;
    } else if (entityType === ENTITY_TYPE.WORKSPACES) {
      selectedEntityName = userResponse.data.entity.workspaces.find((x) => x.workspaceId === selectedEntityId).name;
    }

    toggleNavbarAvatarDropdown(page);
    const settingsActionEnabled =
      roleRepsonse.data.rolePrivileges
        .find((x) => x.name === "profile-dropdown")
        .actions.find((x) => x.value === "profile").toggle ?? false;

    await verifyIconVisibility(
      page,
      "dropdown-overview",
      entityType === ENTITY_TYPE.ORGANIZATION &&
        settingsActionEnabled &&
        selectedEntityName !== organizationNames.ZEE_AUTO_SHOW,
      "Overview",
    );
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Organization Profile Option if roleDetails Permission Mangement Option is enabled and entityType === ENTITY_TYPE.ORGANIZATION`, async ({
    page,
  }) => {
    const response = await getAPIJSONData(page, "get-role");
    await page.waitForTimeout(2000);

    const settingsActionEnabled =
      response.data.rolePrivileges
        .find((x) => x.name === "profile-dropdown")
        .actions.find((x) => x.value === "user_management").toggle ?? false;

    const popover = page.getByTestId(buildTestId("Profile-PopOver"));
    await popover.click();
    const element = page.getByTestId("Dashboard-active-organization");
    await element.waitFor({ state: "visible", timeout: 1000 });
    await popover.click();

    toggleNavbarAvatarDropdown(page);
    const selectedEntityId = await element.getAttribute("data-key");
    const entityType = getEntityType(selectedEntityId);
    await verifyIconVisibility(
      page,
      "organization-profile",
      entityType === ENTITY_TYPE.ORGANIZATION && settingsActionEnabled,
      "Organization Profile",
    );
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Workspace Profile Option if roleDetails Permission Mangement Option is enabled and entityType === ENTITY_TYPE.WORKSPACES`, async ({
    page,
  }) => {
    const response = await getAPIJSONData(page, "get-role");
    await page.waitForTimeout(2000);

    const settingsActionEnabled =
      response.data.rolePrivileges
        .find((x) => x.name === "profile-dropdown")
        .actions.find((x) => x.value === "user_management").toggle ?? false;

    const popover = page.getByTestId(buildTestId("Profile-PopOver"));
    await popover.click();
    const element = page.getByTestId("Dashboard-active-organization");
    await element.waitFor({ state: "visible", timeout: 1000 });
    await popover.click();

    toggleNavbarAvatarDropdown(page);
    const selectedEntityId = await element.getAttribute("data-key");
    const entityType = getEntityType(selectedEntityId);
    await verifyIconVisibility(
      page,
      "workspace-profile",
      entityType === ENTITY_TYPE.WORKSPACES && settingsActionEnabled,
      "Workspace Profile",
    );
  });

  test(`${ROLES.admin} should view the Avatar  Profile Details`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    const response = await getAPIJSONData(page, "me");
    await page.waitForTimeout(2000);
    const user = response.data;

    await verifyIconVisibility(page, "user-avatar", true, user.name.charAt(0).toUpperCase());
    await verifyIconVisibility(page, "user-userName", true, user.name);
    await verifyIconVisibility(page, "user-userEmail", true, user.email);
  });

  test(`${ROLES.admin} should view the Avatar Dropdown Roles & Permission Option if roleDetails Permission Mangement Option is enabled`, async ({
    page,
  }) => {
    toggleNavbarAvatarDropdown(page);
    const response = await getAPIJSONData(page, "get-role");
    await page.waitForTimeout(2000);

    const settingsActionEnabled =
      response.data.rolePrivileges
        .find((x) => x.name === "profile-dropdown")
        .actions.find((x) => x.value === "permission_management").toggle ?? false;
    await verifyIconVisibility(page, "roles-permission", settingsActionEnabled, "Roles & Permission");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown Organization Management Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "organizations", false, "Organization Management");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown Workspace Management Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "workspace", false, "Workspace Management");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown User Management Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "user-management", false, "User Management");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown Ops Management Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "ops", false, "Ops Management");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown Configuration Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    await verifyIconVisibility(page, "configuration", false, "Configuration");
  });

  test(`${ROLES.admin} should not view the Avatar Dropdown Publish History Option`, async ({ page }) => {
    toggleNavbarAvatarDropdown(page);
    const response = await getAPIJSONData(page, "https://stg.api.magnifi.ai/me/");
    await page.waitForTimeout(2000);

    const settingsActionEnabled = response.data.socialProfileKey?.length > 0;
    await verifyIconVisibility(page, "publish-history", settingsActionEnabled, "Publish History");
  });
});
