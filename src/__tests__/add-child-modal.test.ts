import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AddChildModal from '@/components/members/AddChildModal.vue';
import BaseButton from '@/components/shared/BaseButton.vue';

describe('AddChildModal', () => {
  const globalConfig = {
    components: { BaseButton },
    stubs: {
      Teleport: true,
      Transition: false,
    },
  };

  let wrapper: ReturnType<typeof mount>;

  function mountModal(open = true) {
    return mount(AddChildModal, {
      props: { open },
      global: globalConfig,
      attachTo: document.body,
    });
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  beforeEach(() => {
    wrapper = mountModal(true);
  });

  it('renders when open is true', () => {
    expect(wrapper.text()).toContain('Add Child Profile');
  });

  it('shows avatar selection grid', () => {
    // 16 avatar options
    const avatarButtons = wrapper.findAll('button').filter((b) => {
      const ariaLabel = b.attributes('aria-label');
      return ariaLabel && ariaLabel.includes('avatar');
    });
    expect(avatarButtons.length).toBe(16);
  });

  it('shows name input', () => {
    const nameInput = wrapper.find('#child-name');
    expect(nameInput.exists()).toBe(true);
    expect(nameInput.attributes('placeholder')).toBe("Enter child's name");
  });

  it('shows birthday input', () => {
    const birthdayInput = wrapper.find('#child-birthday');
    expect(birthdayInput.exists()).toBe(true);
    expect(birthdayInput.attributes('type')).toBe('date');
  });

  it('disables submit button when form is invalid', () => {
    // Initially form is empty, submit should be disabled
    const submitButton = wrapper.findAll('button').find((b) => b.text().includes('Add Child'));
    expect(submitButton).toBeDefined();
    expect(submitButton!.attributes('disabled')).toBeDefined();
  });

  it('enables submit button when form is valid', async () => {
    const nameInput = wrapper.find('#child-name');
    const birthdayInput = wrapper.find('#child-birthday');

    await nameInput.setValue('Emma');
    await birthdayInput.setValue('2019-05-15');

    const submitButton = wrapper.findAll('button').find((b) => b.text().includes('Add Child'));
    expect(submitButton).toBeDefined();
    expect(submitButton!.attributes('disabled')).toBeUndefined();
  });

  it('emits submit event with correct data', async () => {
    const nameInput = wrapper.find('#child-name');
    const birthdayInput = wrapper.find('#child-birthday');

    await nameInput.setValue('Emma');
    await birthdayInput.setValue('2019-05-15');

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.emitted('submit')).toBeTruthy();
    const emitted = wrapper.emitted('submit')![0][0] as {
      name: string;
      birthday: string;
      avatar: string;
    };
    expect(emitted.name).toBe('Emma');
    expect(emitted.birthday).toBe('2019-05-15');
    expect(emitted.avatar).toBe('👶'); // default avatar
  });

  it('allows selecting a different avatar', async () => {
    // Click the second avatar (👧)
    const avatarButtons = wrapper.findAll('button').filter((b) => {
      const ariaLabel = b.attributes('aria-label');
      return ariaLabel && ariaLabel.includes('avatar');
    });

    // Select "Girl" avatar (second one)
    await avatarButtons[1].trigger('click');

    const nameInput = wrapper.find('#child-name');
    const birthdayInput = wrapper.find('#child-birthday');
    await nameInput.setValue('Lily');
    await birthdayInput.setValue('2020-03-10');

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.emitted('submit')).toBeTruthy();
    const emitted = wrapper.emitted('submit')![0][0] as {
      name: string;
      birthday: string;
      avatar: string;
    };
    expect(emitted.avatar).toBe('👧');
  });

  it('calculates and displays age from birthday', async () => {
    const now = new Date();
    const threeYearsAgo = new Date(
      Date.UTC(now.getFullYear() - 3, now.getMonth(), now.getDate()),
    );
    const birthday = threeYearsAgo.toISOString().split('T')[0];

    const birthdayInput = wrapper.find('#child-birthday');
    await birthdayInput.setValue(birthday);

    expect(wrapper.text()).toContain('Age: 3 years old');
  });

  it('resets form after submission', async () => {
    const nameInput = wrapper.find('#child-name');
    const birthdayInput = wrapper.find('#child-birthday');

    await nameInput.setValue('Emma');
    await birthdayInput.setValue('2019-05-15');

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // After submission, form should be reset
    expect((nameInput.element as HTMLInputElement).value).toBe('');
    expect((birthdayInput.element as HTMLInputElement).value).toBe('');
  });

  it('emits close event when cancel is clicked', async () => {
    const cancelButton = wrapper.findAll('button').find((b) => b.text().includes('Cancel'));
    expect(cancelButton).toBeDefined();

    await cancelButton!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('shows upcoming features preview', () => {
    expect(wrapper.text()).toContain('Personal wishlist');
    expect(wrapper.text()).toContain('Achievement tracking');
    expect(wrapper.text()).toContain('Account activation');
  });

  it('trims whitespace from name on submit', async () => {
    const nameInput = wrapper.find('#child-name');
    const birthdayInput = wrapper.find('#child-birthday');

    await nameInput.setValue('  Emma  ');
    await birthdayInput.setValue('2019-05-15');

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    const emitted = wrapper.emitted('submit')![0][0] as { name: string };
    expect(emitted.name).toBe('Emma');
  });
});
