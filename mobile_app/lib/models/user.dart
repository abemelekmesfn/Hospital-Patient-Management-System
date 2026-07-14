/// Matches the backend UserSerializer fields:
/// id, username, first_name, last_name, email, role
class User {
  final int id;
  final String username;
  final String firstName;
  final String lastName;
  final String email;
  final String role;

  const User({
    required this.id,
    required this.username,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        username: json['username'] as String? ?? '',
        firstName: json['first_name'] as String? ?? '',
        lastName: json['last_name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'first_name': firstName,
        'last_name': lastName,
        'email': email,
        'role': role,
      };

  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isNotEmpty ? name : username;
  }

  String get displayName => fullName.isNotEmpty ? fullName : 'Staff';

  String get initial => (displayName.isNotEmpty ? displayName[0] : '?').toUpperCase();

  String get formattedRole => role.replaceAll('_', ' ');
}
