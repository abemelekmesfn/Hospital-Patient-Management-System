import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../providers/auth_provider.dart';

/// Custom AppBar matching the web TopNav.jsx:
/// #1a237e background, "HPMS" brand badge, page title, user avatar, logout.
class TopNavBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final Widget? centerWidget;

  const TopNavBar({super.key, required this.title, this.centerWidget});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final primaryName = user?.displayName ?? 'Staff';
    final initial = user?.initial ?? '?';
    final secondaryLine = user != null
        ? (user.fullName.isNotEmpty ? user.username : user.formattedRole)
        : '';

    return AppBar(
      automaticallyImplyLeading: false,
      backgroundColor: AppColors.primaryIndigo,
      elevation: 2,
      titleSpacing: 0,
      title: Row(
        children: [
          const SizedBox(width: 14),
          // HPMS brand badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: const Text(
              'HPMS',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                letterSpacing: 0.06 * 13,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Page title
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          if (centerWidget != null) ...[
            const SizedBox(width: 12),
            Expanded(child: centerWidget!),
          ] else
            const Spacer(),
          // User block
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Avatar
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.18),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Name + role (hidden on very small screens)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      primaryName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    if (secondaryLine.isNotEmpty)
                      Text(
                        secondaryLine,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.white.withValues(alpha: 0.78),
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 10),
          // Logout button
          _NavButton(
            icon: Icons.logout_rounded,
            label: 'Log out',
            onTap: () async {
              await auth.logout();
              if (context.mounted) {
                Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
              }
            },
          ),
          const SizedBox(width: 10),
        ],
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _NavButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: Colors.white),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
