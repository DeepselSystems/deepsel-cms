import TemplateEdit from './components/admin/template/TemplateEdit.jsx';
import TemplateList from './components/admin/template/TemplateList.jsx';
import ThemeList from './components/admin/theme/ThemeList.jsx';
import ThemeFileEdit from './components/admin/theme/ThemeFileEdit.jsx';

import PageEdit from './components/admin/page/PageEdit.jsx';
import PageViewComponent from './components/admin/page/PageViewComponent.jsx';
import PageList from './components/admin/page/PageList.jsx';

import MenuTree from './components/admin/menu/MenuTree.jsx';
import CronCreate from './components/admin/cron/CronCreate.jsx';
import CronEdit from './components/admin/cron/CronEdit.jsx';
import CronView from './components/admin/cron/CronView.jsx';
import CronList from './components/admin/cron/CronList.jsx';
import BlogPostCreate from './components/admin/blog_post/BlogPostCreate.jsx';
import BlogPostEdit from './components/admin/blog_post/BlogPostEdit.jsx';
import BlogPostView from './components/admin/blog_post/BlogPostView.jsx';
import BlogPostList from './components/admin/blog_post/BlogPostList.jsx';
import CMSLayout from './components/layouts/CMSLayout.jsx';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Login from './components/admin/auth/Login.jsx';
import ResetPasswordConfirmation from './components/admin/auth/ResetPasswordConfirmation.jsx';
import UserList from './components/admin/user/UserList.jsx';
import UserEdit from './components/admin/user/UserEdit.jsx';
import UserView from './components/admin/user/UserView.jsx';
import UserCreate from './components/admin/user/UserCreate.jsx';
import RoleList from './components/admin/role/RoleList.jsx';
import RoleEdit from './components/admin/role/RoleEdit.jsx';
import RoleView from './components/admin/role/RoleView.jsx';
import RoleCreate from './components/admin/role/RoleCreate.jsx';
import OrganizationLayout from './components/layouts/OrganizationLayout.jsx';
import EmailLayout from './components/layouts/EmailLayout.jsx';
import ResetPassword from './components/admin/auth/ResetPassword.jsx';
import OrganizationSettings from './components/admin/organization/OrganizationSettings.jsx';
import EmailOutboxList from './components/admin/email_outbox/EmailOutboxList.jsx';
import EmailOutboxView from './components/admin/email_outbox/EmailOutboxView.jsx';
import EmailTemplateList from './components/admin/email_template/EmailTemplateList.jsx';
import EmailTemplateView from './components/admin/email_template/EmailTemplateView.jsx';
import EmailTemplateCreate from './components/admin/email_template/EmailTemplateCreate.jsx';
import EmailTemplateEdit from './components/admin/email_template/EmailTemplateEdit.jsx';
import SMTPSettings from './components/admin/organization/SMTPSettings.jsx';
import GoogleAuth from './common/auth/GoogleAuth.jsx';
import SamlAuth from './common/auth/SamlAuth.jsx';
import GoogleSignInSetting from './components/admin/organization/GoogleSignInSetting.jsx';
import SamlSetting from './components/admin/organization/SamlSetting.jsx';
import SiteSettings from './components/admin/site/SiteSettings.jsx';
import SiteCreate from './components/admin/site/SiteCreate.jsx';
import Media from './components/admin/attachment/Media.jsx';
import ReactClient from './ReactClient.jsx';
import RequireAuth from './common/auth/RequireAuth.jsx';
import PublicAuth from './common/auth/PublicAuth.jsx';
import FormList from './components/admin/form/FormList.jsx';
import FormUpsert from './components/admin/form/FormUpsert.jsx';
import FormView from './components/admin/form/FormView.jsx';
import FormSubmissionList from './components/admin/form-submission/FormSubmissionList.jsx';
import FormSubmissionView from './components/admin/form-submission/FormSubmissionView.jsx';
import CampaignList from './components/admin/campaign/CampaignList.jsx';
import CampaignCreate from './components/admin/campaign/CampaignCreate.jsx';
import CampaignView from './components/admin/campaign/CampaignView.jsx';
import CampaignEdit from './components/admin/campaign/CampaignEdit.jsx';

export default function App(props) {
  return (
    <ReactClient {...props}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route element={<PublicAuth />}>
            <Route path="/google-authenticated" element={<GoogleAuth />} />
            <Route path="/saml-authenticated" element={<SamlAuth />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/reset-password-confirmation/:token"
              element={<ResetPasswordConfirmation />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<CMSLayout />}>
              <Route path="/templates" element={<TemplateList />} />
              <Route path="/templates/create" element={<TemplateEdit />} />
              <Route path="/templates/:id/edit" element={<TemplateEdit />} />
              <Route path="/themes" element={<ThemeList />} />
              <Route path="/themes/edit/:themeName" element={<ThemeFileEdit />} />

              <Route path="/blog_posts" element={<BlogPostList />} />
              <Route path="/blog_posts/create" element={<BlogPostCreate />} />
              <Route path="/blog_posts/:id/edit" element={<BlogPostEdit />} />
              <Route path="/blog_posts/:id" element={<BlogPostView />} />
              <Route path="/pages" element={<PageList />} />
              <Route path="/pages/create" element={<PageEdit />} />
              <Route path="/pages/:id/edit" element={<PageEdit />} />
              <Route path="/pages/:id" element={<PageViewComponent />} />
              <Route path="/menus" element={<MenuTree />} />
              <Route path="/manage-users" element={<UserList />} />
              <Route path="/manage-users/:id/edit" element={<UserEdit />} />
              <Route path="/manage-users/:id" element={<UserView />} />
              <Route path="/manage-users/create" element={<UserCreate />} />
              <Route path="/site-settings" element={<SiteSettings />} />
              <Route path="/sites/new" element={<SiteCreate />} />
              <Route path="/media" element={<Media />} />
              <Route path="/forms" element={<FormList />} />
              <Route path="/forms/create" element={<FormUpsert />} />
              <Route path="/forms/:id" element={<FormView />} />
              <Route path="/forms/:id/edit" element={<FormUpsert />} />
              <Route
                path="/form-submissions"
                element={<FormSubmissionList />}
              />
              <Route
                path="/form-submissions/:id"
                element={<FormSubmissionView />}
              />
            </Route>

            <Route element={<OrganizationLayout />}>
              <Route path="/profile/:id/edit" element={<UserEdit />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/users/:id/edit" element={<UserEdit />} />
              <Route path="/users/:id" element={<UserView />} />
              <Route path="/users/create" element={<UserCreate />} />
              <Route path="/roles" element={<RoleList />} />
              <Route path="/roles/:id/edit" element={<RoleEdit />} />
              <Route path="/roles/:id" element={<RoleView />} />
              <Route path="/roles/create" element={<RoleCreate />} />

              <Route
                path="/organization-settings"
                element={<OrganizationSettings />}
              />
              <Route path="/crons" element={<CronList />} />
              <Route path="/crons/create" element={<CronCreate />} />
              <Route path="/crons/:id/edit" element={<CronEdit />} />
              <Route path="/crons/:id" element={<CronView />} />
              <Route
                path="/google-sign-in-settings"
                element={<GoogleSignInSetting />}
              />
              <Route path="/saml-settings" element={<SamlSetting />} />
            </Route>

            <Route element={<EmailLayout />}>
              <Route path="/campaigns" element={<CampaignList />} />
              <Route path="/campaigns/create" element={<CampaignCreate />} />
              <Route path="/campaigns/:id" element={<CampaignView />} />
              <Route path="/campaigns/:id/edit" element={<CampaignEdit />} />
              <Route path="/email_outbox" element={<EmailOutboxList />} />
              <Route path="/email_outbox/:id" element={<EmailOutboxView />} />
              <Route
                path="/email_templates/create"
                element={<EmailTemplateCreate />}
              />
              <Route path="/email_templates" element={<EmailTemplateList />} />
              <Route
                path="/email_templates/:id"
                element={<EmailTemplateView />}
              />
              <Route
                path="/email_templates/:id/edit"
                element={<EmailTemplateEdit />}
              />

              <Route path="/smtp_settings" element={<SMTPSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ReactClient>
  );
}
